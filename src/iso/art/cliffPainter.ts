import type { ReliefHit } from '../../map/cliffRelief';
import { alignOut, type Rect } from '../../map/occluderPacking';
import { ellipse, makeCanvas, type Ctx } from './canvas';
import { blockBounds, cliffColour, cliffNormal, groundTouch, hitAt, type CliffField } from './cliffArt';
import { encodeNormal, N_UP } from './lighting/viewSpace';
import { hash2 } from './palette';

/** Normal maps of cliff chunks / occluders are this many times smaller than the albedo (texture memory). */
export const CLIFF_NORMAL_DOWNSCALE = 4;

const NO_OWNER = -1;

/**
 * World rect of cliff tile (tx, ty)'s occluder cell: its blockBounds
 * grown onto the normal-texel grid, so each occluder normal texel covers
 * exactly the world pixels of one terrain-chunk normal texel (chunks
 * start on that grid too, see TileMap).
 */
export function occluderCellBounds(tx: number, ty: number, maxHeight: number): Rect {
  return alignOut(blockBounds(tx, ty, maxHeight), CLIFF_NORMAL_DOWNSCALE);
}

function ownerOf(field: CliffField, hit: ReliefHit | null): number {
  return hit ? hit.ty * field.width + hit.tx : NO_OWNER;
}

/** True when any cliff block can show inside the world rect (x, y, w, h). */
export function rectTouchesCliffs(field: CliffField, x: number, y: number, w: number, h: number): boolean {
  for (let ty = 0; ty < field.height; ty++) {
    for (let tx = 0; tx < field.width; tx++) {
      if (!field.isCliff(tx, ty)) continue;
      const b = blockBounds(tx, ty, field.relief.maxHeight);
      // Scree and contact shadow reach about a tile in front of the block.
      if (b.x < x + w + 32 && b.x + b.w > x - 32 && b.y < y + h && b.y + b.h + 32 > y) return true;
    }
  }
  return false;
}

/** Scattered fallen rocks along the foot of every exposed face (drawn before the cliff pass). */
function paintRubble(ctx: Ctx, field: CliffField, x0: number, y0: number, w: number, h: number): void {
  for (let ty = 0; ty < field.height; ty++) {
    for (let tx = 0; tx < field.width; tx++) {
      if (!field.isCliff(tx, ty)) continue;
      const cx = (tx - ty) * 32 - x0;
      const cy = (tx + ty) * 16 - y0;
      if (cx < -64 || cy < -64 || cx > w + 64 || cy > h + 64) continue;
      // +u edge runs from the right corner (cx+32, cy) to the bottom corner (cx, cy+16); +v edge mirrors it.
      const edges: Array<[number, number, number]> = [];
      if (!field.isCliff(tx + 1, ty) && tx + 1 < field.width) edges.push([1, 0, 1]);
      if (!field.isCliff(tx, ty + 1) && ty + 1 < field.height) edges.push([-1, 0, 2]);
      for (const [dir, , seed] of edges) {
        const n = 2 + Math.floor(hash2(tx, ty, 80 + seed) * 4);
        for (let k = 0; k < n; k++) {
          const t = hash2(tx, ty, 90 + seed * 10 + k);
          const out = 2 + hash2(tx, ty, 120 + seed * 10 + k) * 7;
          const px = cx + dir * 32 * (1 - t) + dir * out * 0.9;
          const py = cy + 16 * t + out * 0.45 + 1;
          const r = 1.4 + hash2(tx, ty, 140 + seed * 10 + k) * 2.4;
          ctx.fillStyle = 'rgba(30,26,20,.45)';
          ellipse(ctx, px + 0.8, py + 0.8, r, r * 0.6);
          ctx.fill();
          ctx.fillStyle = hash2(tx, ty, 160 + k) > 0.5 ? '#9a8f7c' : '#7d7464';
          ellipse(ctx, px, py, r, r * 0.65);
          ctx.fill();
        }
      }
    }
  }
}

/**
 * Destination for the pixels of cliff blocks that become depth-sorted
 * occluders: the chunk painter copies each such block's pixels (and
 * normals) into its atlas cell while it paints them, so the occluder is
 * pixel-identical to the chunk.
 */
export interface OccluderSink {
  /** Atlas cell top-left (texture px) per tile id (ty · width + tx); its origin is occluderCellBounds() of the tile. */
  readonly cells: ReadonlyMap<number, readonly [number, number]>;
  readonly cellW: number;
  readonly cellH: number;
  readonly albedo: ImageData;
  readonly normal: ImageData | null;
}

const UNSET = -2;
/** Outline beside raised rock: ground samples darkened by distance (in samples) to the nearest rock sample on the same row. */
const OUTLINE_REACH = 3;
const OUTLINE_SHADE = [0.52, 0.68, 0.84];

/** Full-resolution rock grain over the upscaled plateau tops (the low-res pass is soft). */
function grainTop(data: Uint8ClampedArray, o: number, wx: number, wy: number): void {
  const n = hash2(wx >> 1, wy, 81);
  const k = 0.93 + n * 0.12 + (n > 0.95 ? 0.1 : 0) - (hash2(wx, wy, 85) < 0.05 ? 0.14 : 0);
  data[o] = (data[o] ?? 0) * k;
  data[o + 1] = (data[o + 1] ?? 0) * k;
  data[o + 2] = (data[o + 2] ?? 0) * k;
}

/**
 * Cliff relief for one terrain chunk, painted in two passes so the cost
 * stays proportional to the cliff outlines, not their area:
 *  1. sample(): at the chunk's low-res ground samples (every SAMPLE_STEP
 *     px) — plateau tops, faces, scree and normals, upscaled with the ground;
 *  2. finish(): at full resolution only where neighbouring samples disagree
 *     (outlines, faces), anti-aliased from one ray per pixel corner; then
 *     rubble, the occluder copies and the normal map.
 */
export class CliffChunkBake {
  /** Per low-res sample: −1 ground, else owner tile id · 2 (+1 on a face). */
  private readonly codes: Int32Array;
  /** Per low-res sample: the touched ground colour (no rock), for refined pixels. */
  private readonly ground: Int32Array;
  /** Normal map texels (CLIFF_NORMAL_DOWNSCALE px each), filled from the odd low-res samples at their centres. */
  private readonly normals: Uint8ClampedArray | null;
  private readonly nsw: number;
  private readonly up = encodeNormal(N_UP);

  constructor(
    private readonly field: CliffField,
    private readonly x0: number,
    private readonly y0: number,
    private readonly sw: number,
    private readonly sh: number,
    private readonly step: number,
    private readonly sink: OccluderSink | null,
    withNormals: boolean,
  ) {
    this.codes = new Int32Array(sw * sh).fill(NO_OWNER);
    this.ground = new Int32Array(sw * sh);
    if (CLIFF_NORMAL_DOWNSCALE !== step * 2) throw new Error('Cliff normals expect two ground samples per texel');
    this.nsw = Math.ceil(sw / 2);
    this.normals = withNormals ? new Uint8ClampedArray(this.nsw * Math.ceil(sh / 2) * 4) : null;
  }

  /** Pass 1: overrides low-res sample (i, j) of `data` (RGBA) where rock or scree shows. */
  sample(data: Uint8ClampedArray, i: number, j: number): void {
    const wx = this.x0 + i * this.step;
    const wy = this.y0 + j * this.step;
    const k = j * this.sw + i;
    const o = k * 4;
    const groundColour = ((data[o] ?? 0) << 16) | ((data[o + 1] ?? 0) << 8) | (data[o + 2] ?? 0);
    const touched = groundTouch(this.field, wx, wy, groundColour);
    this.ground[k] = touched >= 0 ? touched : groundColour;
    const hit = hitAt(this.field, wx, wy);
    const colour = hit ? cliffColour(this.field, hit, wx, wy) : touched;
    if (colour >= 0) {
      data[o] = (colour >> 16) & 0xff;
      data[o + 1] = (colour >> 8) & 0xff;
      data[o + 2] = colour & 0xff;
    }
    if (hit) {
      data[o + 3] = 255;
      this.codes[k] = ownerOf(this.field, hit) * 2 + (hit.surface === 'face' ? 1 : 0);
    }
    if (this.normals && (i & 1) === 1 && (j & 1) === 1) {
      const [r, g, b] = hit ? encodeNormal(cliffNormal(this.field, hit, wx)) : this.up;
      const q = ((j >> 1) * this.nsw + (i >> 1)) * 4;
      this.normals[q] = r;
      this.normals[q + 1] = g;
      this.normals[q + 2] = b;
      this.normals[q + 3] = 255;
      if (hit) this.copyNormal(ownerOf(this.field, hit), wx, wy, r, g, b);
    }
  }

  /**
   * After pass 1: darkens open ground right beside raised rock on screen
   * (a soft dark line along every outline). Edge-on ridges, whose side
   * walls are invisible in the iso view, read as height through it.
   */
  outline(data: Uint8ClampedArray): void {
    const { sw, sh } = this;
    for (let j = 0; j < sh; j++) {
      for (let i = 0; i < sw; i++) {
        const k = j * sw + i;
        if ((this.codes[k] ?? NO_OWNER) >= 0) continue;
        let d = 0;
        for (let s = 1; s <= OUTLINE_REACH && d === 0; s++) {
          if (i - s >= 0 && (this.codes[k - s] ?? NO_OWNER) >= 0) d = s;
          else if (i + s < sw && (this.codes[k + s] ?? NO_OWNER) >= 0) d = s;
        }
        if (d === 0) continue;
        const f = OUTLINE_SHADE[d - 1] ?? 1;
        const o = k * 4;
        data[o] = (data[o] ?? 0) * f;
        data[o + 1] = (data[o + 1] ?? 0) * f;
        data[o + 2] = (data[o + 2] ?? 0) * f;
        const g = this.ground[k] ?? 0;
        this.ground[k] = (Math.round(((g >> 16) & 0xff) * f) << 16) | (Math.round(((g >> 8) & 0xff) * f) << 8) | Math.round((g & 0xff) * f);
      }
    }
  }

  /** Pass 2 on the upscaled full-res chunk canvas. Returns the normal map (null without normals). */
  finish(canvas: HTMLCanvasElement): HTMLCanvasElement | null {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const w = canvas.width;
    const h = canvas.height;
    const img = ctx.getImageData(0, 0, w, h);
    const data = img.data;
    const cols = w + 1;
    const owners = new Int32Array(cols * (h + 1)).fill(UNSET);
    const colours = new Int32Array(cols * (h + 1));
    const corner = [0, 0, 0, 0];
    const cornerAt = (k: number, x: number, y: number): void => {
      if (owners[k] !== UNSET) return;
      const hit = hitAt(this.field, x, y);
      owners[k] = ownerOf(this.field, hit);
      colours[k] = hit ? cliffColour(this.field, hit, x, y) : 0;
    };
    const st = this.step;
    for (let j = 0; j < h; j++) {
      const b = Math.min(this.sh - 2, Math.floor(j / st));
      for (let i = 0; i < w; i++) {
        const a = Math.min(this.sw - 2, Math.floor(i / st));
        const k = b * this.sw + a;
        const c = this.codes[k] ?? NO_OWNER;
        const o = (j * w + i) * 4;
        const uniform =
          (c < 0 || (c & 1) === 0) && this.codes[k + 1] === c && this.codes[k + this.sw] === c && this.codes[k + this.sw + 1] === c;
        if (uniform) {
          if (c >= 0) {
            grainTop(data, o, this.x0 + i, this.y0 + j);
            if (this.sink) this.copyPixel(c >> 1, data, o, this.x0 + i, this.y0 + j, 4);
          }
          continue;
        }
        corner[0] = j * cols + i;
        corner[1] = corner[0] + 1;
        corner[2] = corner[0] + cols;
        corner[3] = corner[2] + 1;
        cornerAt(corner[0], this.x0 + i, this.y0 + j);
        cornerAt(corner[1], this.x0 + i + 1, this.y0 + j);
        cornerAt(corner[2], this.x0 + i, this.y0 + j + 1);
        cornerAt(corner[3], this.x0 + i + 1, this.y0 + j + 1);
        const g = this.ground[Math.min(this.sh - 1, Math.round(j / st)) * this.sw + Math.min(this.sw - 1, Math.round(i / st))] ?? 0;
        let hits = 0;
        let R = 0;
        let G = 0;
        let B = 0;
        for (const q of corner) {
          const col = (owners[q] ?? NO_OWNER) >= 0 ? (colours[q] ?? 0) : g;
          if ((owners[q] ?? NO_OWNER) >= 0) hits++;
          R += (col >> 16) & 0xff;
          G += (col >> 8) & 0xff;
          B += col & 0xff;
        }
        data[o] = R / 4;
        data[o + 1] = G / 4;
        data[o + 2] = B / 4;
        if (hits > 0) data[o + 3] = Math.max(data[o + 3] ?? 0, Math.round((255 * hits) / 4));
        if (hits > 0 && this.sink) copyToOccluders(this.sink, this.field, owners, colours, corner, this.x0 + i, this.y0 + j);
      }
    }
    ctx.putImageData(img, 0, 0);
    paintRubble(ctx, this.field, this.x0, this.y0, w, h);
    return this.normalCanvas(Math.ceil(w / CLIFF_NORMAL_DOWNSCALE), Math.ceil(h / CLIFF_NORMAL_DOWNSCALE));
  }

  /** Copies a uniformly owned chunk pixel into the owner's occluder cell. */
  private copyPixel(id: number, data: Uint8ClampedArray, o: number, wx: number, wy: number, n: number): void {
    const sink = this.sink;
    const cell = sink?.cells.get(id);
    if (!sink || !cell) return;
    const [ox, oy] = cellOrigin(this.field, id);
    const dx = wx - ox;
    const dy = wy - oy;
    if (dx < 0 || dy < 0 || dx >= sink.cellW || dy >= sink.cellH) return;
    const q = ((cell[1] + dy) * sink.albedo.width + cell[0] + dx) * 4;
    sink.albedo.data[q] = data[o] ?? 0;
    sink.albedo.data[q + 1] = data[o + 1] ?? 0;
    sink.albedo.data[q + 2] = data[o + 2] ?? 0;
    sink.albedo.data[q + 3] = Math.round((255 * n) / 4);
  }

  private copyNormal(id: number, wx: number, wy: number, r: number, g: number, b: number): void {
    const sink = this.sink;
    const cell = sink?.cells.get(id);
    if (!sink?.normal || !cell) return;
    const [ox, oy] = cellOrigin(this.field, id);
    if (wx < ox || wy < oy || wx >= ox + sink.cellW || wy >= oy + sink.cellH) return;
    const s = CLIFF_NORMAL_DOWNSCALE;
    const q = (Math.floor((cell[1] + wy - oy) / s) * sink.normal.width + Math.floor((cell[0] + wx - ox) / s)) * 4;
    sink.normal.data[q] = r;
    sink.normal.data[q + 1] = g;
    sink.normal.data[q + 2] = b;
    sink.normal.data[q + 3] = 255;
  }

  private normalCanvas(nw: number, nh: number): HTMLCanvasElement | null {
    if (!this.normals) return null;
    const { canvas, ctx } = makeCanvas(nw, nh);
    const img = ctx.createImageData(nw, nh);
    const cols = Math.min(nw, this.nsw);
    for (let j = 0; j < nh; j++) {
      const from = j * this.nsw * 4;
      if (from >= this.normals.length) break;
      img.data.set(this.normals.subarray(from, from + cols * 4), j * nw * 4);
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }
}

/** Top-left (world px) of a tile's occluder cell, see occluderCellBounds. */
function cellOrigin(field: CliffField, id: number): [number, number] {
  const b = occluderCellBounds(id % field.width, Math.floor(id / field.width), field.relief.maxHeight);
  return [b.x, b.y];
}

function copyToOccluders(
  sink: OccluderSink,
  field: CliffField,
  owners: Int32Array,
  colours: Int32Array,
  corner: readonly number[],
  wx: number,
  wy: number,
): void {
  for (let n = 0; n < 4; n++) {
    const id = owners[corner[n] ?? 0] ?? NO_OWNER;
    // Each owner once per pixel: skip if an earlier corner had it.
    let seen = false;
    for (let m = 0; m < n; m++) if (owners[corner[m] ?? 0] === id) seen = true;
    const cell = id >= 0 && !seen ? sink.cells.get(id) : undefined;
    if (!cell) continue;
    const [ox, oy] = cellOrigin(field, id);
    const dx = wx - ox;
    const dy = wy - oy;
    if (dx < 0 || dy < 0 || dx >= sink.cellW || dy >= sink.cellH) continue;
    let count = 0;
    let r = 0;
    let g = 0;
    let b = 0;
    for (const k of corner) {
      if (owners[k] !== id) continue;
      const c = colours[k] ?? 0;
      r += (c >> 16) & 0xff;
      g += (c >> 8) & 0xff;
      b += c & 0xff;
      count++;
    }
    const o = ((cell[1] + dy) * sink.albedo.width + cell[0] + dx) * 4;
    sink.albedo.data[o] = r / count;
    sink.albedo.data[o + 1] = g / count;
    sink.albedo.data[o + 2] = b / count;
    sink.albedo.data[o + 3] = Math.round((255 * count) / 4);
  }
}

