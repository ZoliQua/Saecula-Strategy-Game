import { LIGHTING_ENABLED, SHADOW, UNIT_SHADOW_DOWNSCALE } from '../../../config/visual';
import { CIV_DEFS } from '../../../config/civs';
import type { CivId, UnitType } from '../../../types';
import { boxBlur } from '../lighting/deriveNormals';
import { halveNormals } from '../lighting/halfNormals';
import { halveMask } from './halfMask';
import { ANIM_FRAMES, frameContent, paintOrder, sheetLayout, unitAnims, type SheetLayout, type UnitAnim } from './layout';
import { contactShadow, unitLook } from './looks';
import { FrameRaster, type ContactShadow, type FramePixels } from './raster';
import { buildFigure, figureBounds, frameBounds } from './rig';

/** Transparent margin around the figure (outline + anti-aliasing) in an animation's logical box, art px. */
const PAD = 4;
/**
 * Margin around the figure in a packed frame rectangle, art px: the
 * outline ring reaches 2 px past the pixels the figure covers, and those
 * lie inside its bounds (samples sit at pixel centres ± 0.25), so
 * ceil(bound + 2) contains every painted pixel (sheetPacking.test.ts
 * checks each frame of each look).
 */
const RECT_PAD = 2;

/**
 * Half extents (art px from the feet point) of the contact shadow's
 * visible pixels: its alpha, alpha · (1 − d)² with d the squared ellipse
 * distance, rounds to 0 in 8 bits beyond d = 1 − √(0.5 / (255 · alpha));
 * + 0.5 for pixel centres.
 */
function shadowReach(shadow: ContactShadow): { x: number; y: number } {
  const r = Math.sqrt(Math.max(0, 1 - Math.sqrt(0.5 / (255 * shadow.alpha))));
  return { x: shadow.rx * r + 0.5, y: shadow.ry * r + 0.5 };
}

/** Logical frame box of one animation (all its frames and headings share it): what a sprite's origin and size refer to. */
export interface AnimBlock {
  /** Frame size; frames are centred on the feet horizontally. */
  readonly w: number;
  readonly h: number;
  /** Feet line inside a frame (px from the top). */
  readonly feetY: number;
}

/**
 * Where one frame is stored: its packed rectangle in the sheet (x, y, w,
 * h) and that rectangle's offset inside the frame's logical box (ox, oy).
 * Every edge is a multiple of UNIT_SHADOW_DOWNSCALE (even too, for the
 * half-size mask and normal map).
 */
export interface FrameRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly ox: number;
  readonly oy: number;
}

/** Sheet geometry of a type: each animation's logical box, each frame's packed rectangle (indexed by frame number). */
export interface SheetGeometry {
  readonly layout: SheetLayout;
  readonly blocks: Readonly<Partial<Record<UnitAnim, AnimBlock>>>;
  readonly frames: readonly FrameRect[];
  readonly width: number;
  readonly height: number;
}

/**
 * A unit type's painted sheets: albedo, team mask and normal map (shared
 * by the mask) at half resolution (same layout at x / 2, y / 2) and a
 * cast-shadow silhouette at 1 / UNIT_SHADOW_DOWNSCALE resolution.
 * Frames are painted lazily in paintOrder(); `painted[k]` says which
 * are ready.
 */
export interface UnitSheet extends SheetGeometry {
  readonly type: UnitType;
  readonly civ: CivId;
  readonly albedo: HTMLCanvasElement;
  readonly mask: HTMLCanvasElement;
  readonly normal: HTMLCanvasElement | null;
  readonly shadow: HTMLCanvasElement | null;
  readonly painted: Uint8Array;
  /** frames finished; totalMs of painting; maxMs = longest single paint step. */
  readonly stats: { frames: number; totalMs: number; maxMs: number };
  queue: number[];
  /** Rasters by packed frame size (`<w>x<h>`), reused between frames. */
  rasters: Map<string, FrameRaster>;
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
  /** Half resolution (at x / 2, y / 2), like the normal map. */
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

/** Frame edges are multiples of the shadow downscale (also even, for the half-size normal map and mask). */
const S = UNIT_SHADOW_DOWNSCALE;
const aligned = (n: number): number => Math.ceil(n / S) * S;
const alignedDown = (n: number): number => Math.floor(n / S) * S;

const geometries = new Map<string, SheetGeometry>();

const FALLBACK_BLOCK: AnimBlock = { w: S, h: S, feetY: S / 2 };

/**
 * Frame boxes fitted to every pose of each animation, and each frame's
 * own content rectangle (figure with its outline, and the visible part
 * of the contact shadow) shelf-packed into the sheet, tallest first
 * (computed once per type and unit look). Only the rectangles are stored; sprites keep the logical
 * box (Frame.setTrim), so origin and feet line do not move.
 */
export function sheetGeometry(type: UnitType, civ: CivId): SheetGeometry {
  const id = `${type}~${CIV_DEFS[civ].unitLook}`;
  const hit = geometries.get(id);
  if (hit) return hit;
  const layout = sheetLayout(unitAnims(type));
  const shadow = contactShadow(unitLook(type, civ));
  const blocks: Partial<Record<UnitAnim, AnimBlock>> = {};
  for (const anim of layout.anims) {
    const b = figureBounds(type, civ, [anim], ANIM_FRAMES);
    const w = aligned(2 * Math.ceil(Math.max(b.halfWidth, shadow.rx) + PAD));
    const feetY = Math.ceil(b.above + PAD);
    const h = aligned(feetY + Math.ceil(Math.max(b.below, shadow.ry) + PAD));
    blocks[anim] = { w, h, feetY };
  }
  const reach = shadowReach(shadow);
  const boxes: Array<{ k: number; w: number; h: number; ox: number; oy: number }> = [];
  for (let k = 0; k < layout.frameCount; k++) {
    const { slot, anim, i } = frameContent(layout, k);
    const b = blocks[anim] ?? FALLBACK_BLOCK;
    const e = frameBounds(type, civ, slot, anim, i);
    const cx = b.w / 2;
    const x0 = Math.max(0, alignedDown(cx - Math.ceil(Math.max(e.left + RECT_PAD, reach.x))));
    const x1 = Math.min(b.w, aligned(cx + Math.ceil(Math.max(e.right + RECT_PAD, reach.x))));
    const y0 = Math.max(0, alignedDown(b.feetY - Math.ceil(Math.max(e.above + RECT_PAD, reach.y))));
    const y1 = Math.min(b.h, aligned(b.feetY + Math.ceil(Math.max(e.below + RECT_PAD, reach.y))));
    boxes.push({ k, w: x1 - x0, h: y1 - y0, ox: x0, oy: y0 });
  }
  const g: SheetGeometry = { layout, blocks, ...shelfPack(boxes) };
  geometries.set(id, g);
  return g;
}

/** Shelf packing, tallest first, at the sheet width (tried around the square) that gives the smallest sheet. */
function shelfPack(boxes: ReadonlyArray<{ k: number; w: number; h: number; ox: number; oy: number }>): { frames: FrameRect[]; width: number; height: number } {
  const order = [...boxes].sort((a, b) => b.h - a.h || b.w - a.w || a.k - b.k);
  const area = boxes.reduce((sum, b) => sum + b.w * b.h, 0);
  const widest = Math.max(S, ...boxes.map((b) => b.w));
  // First fit decreasing height: a frame goes on the first shelf with room left (every shelf is at least as tall), else opens one.
  const place = (width: number) => {
    const frames: FrameRect[] = [];
    const shelves: Array<{ y: number; h: number; x: number }> = [];
    let height = 0;
    for (const b of order) {
      let shelf = shelves.find((s) => s.x + b.w <= width);
      if (!shelf) {
        shelf = { y: height, h: b.h, x: 0 };
        shelves.push(shelf);
        height += b.h;
      }
      frames[b.k] = { x: shelf.x, y: shelf.y, w: b.w, h: b.h, ox: b.ox, oy: b.oy };
      shelf.x += b.w;
    }
    return { frames, width, height };
  };
  let best = place(widest);
  const side = Math.sqrt(area);
  for (let width = Math.max(widest, aligned(side * 0.7)); width <= aligned(side * 1.6); width += S) {
    const p = place(width);
    if (p.width * p.height < best.width * best.height) best = p;
  }
  return best;
}

/** Allocates the blank sheets of a type in a civ's look. */
export function createSheet(type: UnitType, civ: CivId): UnitSheet {
  const g = sheetGeometry(type, civ);
  return {
    ...g,
    type,
    civ,
    albedo: cpuCanvas(g.width, g.height),
    // Half resolution (one texel per world pixel, as sprites show at 1 / ART_SCALE): a quarter of the memory (see halveMask).
    mask: cpuCanvas(g.width / 2, g.height / 2),
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

/** Logical box (size and feet line) of frame `k`: what the sprite's size and origin refer to. */
export function frameBox(g: SheetGeometry, k: number): AnimBlock {
  return g.blocks[frameContent(g.layout, k).anim] ?? FALLBACK_BLOCK;
}

const NO_RECT: FrameRect = { x: 0, y: 0, w: S, h: S, ox: 0, oy: 0 };

/** Packed rectangle of frame `k` in the sheet (and its offset in the logical box). */
export function frameRect(g: SheetGeometry, k: number): FrameRect {
  return g.frames[k] ?? NO_RECT;
}

/** A raster of frame `k`'s packed size with the feet point where the frame's logical box puts it (one raster per size, reused). */
function rasterFor(g: SheetGeometry, k: number, cache?: Map<string, FrameRaster>): FrameRaster {
  const r = frameRect(g, k);
  const b = frameBox(g, k);
  const id = `${r.w}x${r.h}`;
  const raster = cache?.get(id) ?? new FrameRaster(r.w, r.h, 0, 0);
  cache?.set(id, raster);
  raster.setOrigin(b.w / 2 - r.ox, b.feetY - r.oy);
  return raster;
}

/** Rasterizes frame `k` of a type in a civ's look into its packed rectangle (frameRect). */
export function rasterizeFrame(type: UnitType, civ: CivId, k: number): FramePixels {
  const g = sheetGeometry(type, civ);
  const { slot, anim, i } = frameContent(g.layout, k);
  const fig = buildFigure(type, civ, slot, anim, i);
  return rasterFor(g, k).paint(fig.prims, fig.mats.list, contactShadow(unitLook(type, civ)));
}

/**
 * Paints frame `k` into all sheets. With a `deadline` the rasterization
 * may stop early (returns false) and resume on the next call.
 */
export function paintFrame(sheet: UnitSheet, k: number, deadline = Infinity): boolean {
  if (sheet.painted[k]) return true;
  const t0 = performance.now();
  const { slot, anim, i } = frameContent(sheet.layout, k);
  const raster = rasterFor(sheet, k, sheet.rasters);
  if (sheet.active !== k) {
    const fig = buildFigure(sheet.type, sheet.civ, slot, anim, i);
    raster.begin(fig.prims, fig.mats.list, contactShadow(unitLook(sheet.type, sheet.civ)));
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
  const half = halveMask(px.mask, w, h);
  const mask = new ImageData(half.data, half.width, half.height);
  const normal = sheet.normal ? halfNormalBlock(px, w, h) : null;
  const shadow = sheet.shadow ? shadowBlock(px.coverage, w, h) : null;
  ctx2d(sheet.albedo).putImageData(albedo, x, y);
  ctx2d(sheet.mask).putImageData(mask, x / 2, y / 2);
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
 * HUD portraits: the SE idle frame of the type in a civ's look.
 */
export function paintPortrait(type: UnitType, civ: CivId, teamColor: number): HTMLCanvasElement {
  const g = sheetGeometry(type, civ);
  // The whole logical box (not the packed rectangle), as the sprite shows it.
  const { w, h, feetY } = frameBox(g, 0);
  const fig = buildFigure(type, civ, 0, 'idle', 0);
  const px = new FrameRaster(w, h, w / 2, feetY).paint(fig.prims, fig.mats.list, contactShadow(unitLook(type, civ)));
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
