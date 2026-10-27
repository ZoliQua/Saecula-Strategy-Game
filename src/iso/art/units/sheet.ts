import { LIGHTING_ENABLED, SHADOW, UNIT_SHADOW_DOWNSCALE } from '../../../config/visual';
import type { UnitType } from '../../../types';
import { boxBlur } from '../lighting/deriveNormals';
import { halveNormals } from '../lighting/halfNormals';
import { ANIM_FRAMES, frameContent, PAINTED_HEADINGS, paintOrder, sheetLayout, unitAnims, type SheetLayout, type UnitAnim } from './layout';
import { contactShadow, UNIT_LOOKS } from './looks';
import { FrameRaster, type FramePixels } from './raster';
import { buildFigure, figureBounds } from './rig';

/** Transparent margin around the figure (outline + anti-aliasing), art px. */
const PAD = 4;

/** Frame box of one animation (all its frames and headings share it). */
export interface AnimBlock {
  /** Top-left of the block in the sheet. */
  readonly x: number;
  readonly y: number;
  /** Frame size; frames are centred on the feet horizontally. */
  readonly w: number;
  readonly h: number;
  /** Feet line inside a frame (px from the top). */
  readonly feetY: number;
}

/** Sheet geometry of a type: one block per animation, shelf-packed. */
export interface SheetGeometry {
  readonly layout: SheetLayout;
  readonly blocks: Readonly<Partial<Record<UnitAnim, AnimBlock>>>;
  readonly width: number;
  readonly height: number;
}

/**
 * A unit type's painted sheets: albedo, team mask (same layout), a
 * half-resolution normal map (shared by the mask) and a cast-shadow
 * silhouette at 1 / UNIT_SHADOW_DOWNSCALE resolution.
 * Frames are painted lazily in paintOrder(); `painted[k]` says which
 * are ready.
 */
export interface UnitSheet extends SheetGeometry {
  readonly type: UnitType;
  readonly albedo: HTMLCanvasElement;
  readonly mask: HTMLCanvasElement;
  readonly normal: HTMLCanvasElement | null;
  readonly shadow: HTMLCanvasElement | null;
  readonly painted: Uint8Array;
  /** frames finished; totalMs of painting; maxMs = longest single paint step. */
  readonly stats: { frames: number; totalMs: number; maxMs: number };
  queue: number[];
  rasters: Map<UnitAnim, FrameRaster>;
  /** Frame whose resumable rasterization is in progress (−1 = none). */
  active: number;
  /** Frames painted since the last GPU upload. */
  dirty: DirtyFrame[];
}

/** A freshly painted frame's pixels, for a partial GPU upload. */
export interface DirtyFrame {
  readonly x: number;
  readonly y: number;
  readonly albedo: ImageData;
  readonly mask: ImageData;
  /** Half resolution (at x / 2, y / 2). */
  readonly normal: ImageData | null;
  readonly shadow: ImageData | null;
}

/** CPU-backed canvas: frames are written with putImageData, never drawn. */
function cpuCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(2, w);
  c.height = Math.max(2, h);
  c.getContext('2d', { willReadFrequently: true });
  return c;
}

const ctx2d = (c: HTMLCanvasElement): CanvasRenderingContext2D => {
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas context unavailable');
  return ctx;
};

/** Frame sides are multiples of the shadow downscale (also even, for the half-size normal map). */
const aligned = (n: number): number => Math.ceil(n / UNIT_SHADOW_DOWNSCALE) * UNIT_SHADOW_DOWNSCALE;

const geometries = new Map<UnitType, SheetGeometry>();

/** Frame boxes fitted to every pose of each animation (computed once per type). */
export function sheetGeometry(type: UnitType): SheetGeometry {
  const hit = geometries.get(type);
  if (hit) return hit;
  const layout = sheetLayout(unitAnims(type));
  const shadow = contactShadow(UNIT_LOOKS[type]);
  const rows = PAINTED_HEADINGS.length;
  const sizes = layout.anims.map((anim) => {
    const b = figureBounds(type, [anim], ANIM_FRAMES);
    const w = aligned(2 * Math.ceil(Math.max(b.halfWidth, shadow.rx) + PAD));
    const feetY = Math.ceil(b.above + PAD);
    const h = aligned(feetY + Math.ceil(Math.max(b.below, shadow.ry) + PAD));
    return { anim, w, h, feetY, bw: w * ANIM_FRAMES[anim], bh: h * rows };
  });
  // Shelf packing, tallest blocks first.
  const width = Math.max(...sizes.map((s) => s.bw));
  const blocks: Partial<Record<UnitAnim, AnimBlock>> = {};
  let x = 0;
  let y = 0;
  let shelf = 0;
  for (const s of [...sizes].sort((a, b) => b.bh - a.bh)) {
    if (x + s.bw > width) {
      x = 0;
      y += shelf;
      shelf = 0;
    }
    blocks[s.anim] = { x, y, w: s.w, h: s.h, feetY: s.feetY };
    x += s.bw;
    shelf = Math.max(shelf, s.bh);
  }
  const g: SheetGeometry = { layout, blocks, width, height: y + shelf };
  geometries.set(type, g);
  return g;
}

/** Allocates the blank sheets of a type. */
export function createSheet(type: UnitType): UnitSheet {
  const g = sheetGeometry(type);
  return {
    ...g,
    type,
    albedo: cpuCanvas(g.width, g.height),
    mask: cpuCanvas(g.width, g.height),
    // Half resolution, like the shadow: a quarter of the memory, same shading (see halveNormals).
    normal: LIGHTING_ENABLED ? cpuCanvas(g.width / 2, g.height / 2) : null,
    shadow: LIGHTING_ENABLED ? cpuCanvas(g.width / UNIT_SHADOW_DOWNSCALE, g.height / UNIT_SHADOW_DOWNSCALE) : null,
    painted: new Uint8Array(g.layout.frameCount),
    stats: { frames: 0, totalMs: 0, maxMs: 0 },
    queue: paintOrder(g.layout),
    rasters: new Map(),
    active: -1,
    dirty: [],
  };
}

/** Rectangle and feet line of frame `k` in the sheet. */
export function frameRect(g: SheetGeometry, k: number): { x: number; y: number; w: number; h: number; feetY: number } {
  const { slot, anim, i } = frameContent(g.layout, k);
  const b = g.blocks[anim] ?? { x: 0, y: 0, w: 2, h: 2, feetY: 1 };
  return { x: b.x + i * b.w, y: b.y + slot * b.h, w: b.w, h: b.h, feetY: b.feetY };
}

function rasterFor(g: SheetGeometry, anim: UnitAnim, cache?: Map<UnitAnim, FrameRaster>): FrameRaster {
  const hit = cache?.get(anim);
  if (hit) return hit;
  const b = g.blocks[anim] ?? { x: 0, y: 0, w: 2, h: 2, feetY: 1 };
  const r = new FrameRaster(b.w, b.h, b.w / 2, b.feetY);
  cache?.set(anim, r);
  return r;
}

/** Rasterizes frame `k` of a type. */
function rasterize(type: UnitType, g: SheetGeometry, k: number, cache?: Map<UnitAnim, FrameRaster>): FramePixels {
  const { slot, anim, i } = frameContent(g.layout, k);
  const fig = buildFigure(type, slot, anim, i);
  return rasterFor(g, anim, cache).paint(fig.prims, fig.mats.list, contactShadow(UNIT_LOOKS[type]));
}

/**
 * Paints frame `k` into all sheets. With a `deadline` the rasterization
 * may stop early (returns false) and resume on the next call.
 */
export function paintFrame(sheet: UnitSheet, k: number, deadline = Infinity): boolean {
  if (sheet.painted[k]) return true;
  const t0 = performance.now();
  const { slot, anim, i } = frameContent(sheet.layout, k);
  const raster = rasterFor(sheet, anim, sheet.rasters);
  if (sheet.active !== k) {
    const fig = buildFigure(sheet.type, slot, anim, i);
    raster.begin(fig.prims, fig.mats.list, contactShadow(UNIT_LOOKS[sheet.type]));
    sheet.active = k;
  }
  const done = raster.step(deadline);
  sheet.stats.totalMs += performance.now() - t0;
  if (!done) return false;
  sheet.active = -1;
  storeFrame(sheet, k, raster.pixels);
  sheet.stats.frames++;
  return true;
}

function storeFrame(sheet: UnitSheet, k: number, px: FramePixels): void {
  const t0 = performance.now();
  const { x, y, w, h } = frameRect(sheet, k);
  // Copies: the raster's buffers are reused for the next frame.
  const albedo = new ImageData(px.albedo.slice(), w, h);
  const mask = new ImageData(px.mask.slice(), w, h);
  const normal = sheet.normal ? halfNormalBlock(px, w, h) : null;
  const shadow = sheet.shadow ? shadowBlock(px.coverage, w, h) : null;
  ctx2d(sheet.albedo).putImageData(albedo, x, y);
  ctx2d(sheet.mask).putImageData(mask, x, y);
  if (sheet.normal && normal) ctx2d(sheet.normal).putImageData(normal, x / 2, y / 2);
  if (sheet.shadow && shadow) ctx2d(sheet.shadow).putImageData(shadow, x / UNIT_SHADOW_DOWNSCALE, y / UNIT_SHADOW_DOWNSCALE);
  sheet.dirty.push({ x, y, albedo, mask, normal, shadow });
  sheet.painted[k] = 1;
  sheet.stats.totalMs += performance.now() - t0;
}

/** Paints queued frames for up to `budgetMs` (or `maxFrames`); returns how many were finished. */
export function paintSome(sheet: UnitSheet, budgetMs: number, maxFrames = Infinity): number {
  const t0 = performance.now();
  const deadline = t0 + budgetMs;
  let n = 0;
  while (sheet.queue.length > 0 && n < maxFrames) {
    const k = sheet.queue[0];
    if (k === undefined) break;
    if (!sheet.painted[k]) {
      const step0 = performance.now();
      const done = paintFrame(sheet, k, deadline);
      sheet.stats.maxMs = Math.max(sheet.stats.maxMs, performance.now() - step0);
      if (!done) break;
      n++;
    }
    sheet.queue.shift();
    if (performance.now() >= deadline) break;
  }
  if (sheet.queue.length === 0) sheet.rasters.clear();
  return n;
}

/** Half-resolution normal map of a frame (covered pixels only at the silhouette). */
function halfNormalBlock(px: FramePixels, w: number, h: number): ImageData {
  const half = halveNormals(px.normal, w, h, (i) => px.coverage[i] ?? 0);
  return new ImageData(half.data, half.width, half.height);
}

/** Blurred silhouette (cast shadow) of a frame at 1 / UNIT_SHADOW_DOWNSCALE resolution. */
function shadowBlock(coverage: Float32Array, w: number, h: number): ImageData {
  const s = UNIT_SHADOW_DOWNSCALE;
  const hw = w / s;
  const hh = h / s;
  const small = new Float32Array(hw * hh);
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < hw; x++) {
      let sum = 0;
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) sum += coverage[(y * s + dy) * w + x * s + dx] ?? 0;
      const c = sum / (s * s);
      small[y * hw + x] = c >= 0.5 ? 1 : c * 2 * 0.6;
    }
  }
  const r = Math.max(1, Math.round(SHADOW.blur / s));
  const soft = boxBlur(boxBlur(small, hw, hh, r), hw, hh, r);
  const img = new ImageData(hw, hh);
  for (let i = 0; i < soft.length; i++) {
    img.data[i * 4] = 6;
    img.data[i * 4 + 1] = 10;
    img.data[i * 4 + 2] = 16;
    img.data[i * 4 + 3] = Math.round(Math.min(1, soft[i] ?? 0) * 255);
  }
  return img;
}

/**
 * A single composited frame (albedo with the team mask tinted in), for
 * HUD portraits. Uses the SE idle frame.
 */
export function paintPortrait(type: UnitType, teamColor: number): HTMLCanvasElement {
  const g = sheetGeometry(type);
  const px = rasterize(type, g, 0);
  const { w, h } = frameRect(g, 0);
  const canvas = cpuCanvas(w, h);
  const ctx = ctx2d(canvas);
  const img = new ImageData(w, h);
  const tr = (teamColor >> 16) & 255;
  const tg = (teamColor >> 8) & 255;
  const tb = teamColor & 255;
  for (let i = 0; i < img.data.length; i += 4) {
    const ma = (px.mask[i + 3] ?? 0) / 255;
    const g = (px.mask[i] ?? 0) / 255;
    img.data[i] = (px.albedo[i] ?? 0) * (1 - ma) + tr * g * ma;
    img.data[i + 1] = (px.albedo[i + 1] ?? 0) * (1 - ma) + tg * g * ma;
    img.data[i + 2] = (px.albedo[i + 2] ?? 0) * (1 - ma) + tb * g * ma;
    img.data[i + 3] = px.albedo[i + 3] ?? 0;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
