import { TILE_HEIGHT } from '../config/constants';
import { fbm } from '../iso/art/palette';
import type { CliffTest } from './cliffGeometry';
import { tileShare } from './tileShare';

/**
 * Organic relief over the tile grid of cliffs. Gameplay is per tile
 * (cliff tiles are impassable); the rock drawn on them is eroded inward
 * by noise so plateaus get bays, rounded spurs and a rolling top instead
 * of a tile staircase. Rock never grows past its cliff tiles.
 *
 * `edge` is a smooth field: > 0.5 is rock. `top` is the plateau height
 * in screen px. Both are sampled on a grid of `res` points per tile
 * (grid point k sits at tile coordinate k / res − 0.5) and interpolated.
 */
export interface Relief {
  readonly width: number;
  readonly height: number;
  readonly res: number;
  readonly isCliff: CliffTest;
  readonly maxHeight: number;
  readonly edge: Float32Array;
  readonly top: Float32Array;
  /** Per tile: 1 when a cliff tile lies within −1..+2 tiles on both axes (fast reject). */
  readonly near: Uint8Array;
  /** Per tile: 1 on a mountain pass (see findPasses). */
  readonly pass: Uint8Array;
}

export interface ReliefHit {
  readonly surface: 'top' | 'face';
  /** The cliff tile the visible rock belongs to. */
  readonly tx: number;
  readonly ty: number;
  /** Height of the hit above the ground, screen px. */
  readonly h: number;
  /** Tile-space ground point under the hit. */
  readonly u: number;
  readonly v: number;
}

/** How far (in edge-field units) the rock is pulled back from the tile edge on average, and the noise swing. */
const EROSION = 0.27;
const WOBBLE = 0.75;

/**
 * Walkable tiles in a 1–2 tile lane cut through rock: cliff within two
 * tiles on both sides along one axis (the Islands "bridges").
 */
export function findPasses(isCliff: CliffTest, width: number, height: number): Uint8Array {
  const pass = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isCliff(x, y)) continue;
      const near = (dx: number, dy: number) => isCliff(x + dx, y + dy) || isCliff(x + 2 * dx, y + 2 * dy);
      if ((near(-1, 0) && near(1, 0)) || (near(0, -1) && near(0, 1))) pass[y * width + x] = 1;
    }
  }
  return pass;
}

/** Tiles of rock around a pass that slope down to it and stand back from the lane. */
const PASS_REACH = 3;

/** Per tile: 0 on a pass … 1 at PASS_REACH tiles or more from one. */
function passFalloff(pass: Uint8Array, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height).fill(1);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pass[y * width + x] !== 1) continue;
      for (let dy = -PASS_REACH; dy <= PASS_REACH; dy++) {
        for (let dx = -PASS_REACH; dx <= PASS_REACH; dx++) {
          const tx = x + dx;
          const ty = y + dy;
          if (tx < 0 || ty < 0 || tx >= width || ty >= height) continue;
          const i = ty * width + tx;
          out[i] = Math.min(out[i] ?? 1, Math.min(1, Math.hypot(dx, dy) / PASS_REACH));
        }
      }
    }
  }
  return out;
}

/** Bilinear sample of a per-tile field at tile coordinates (clamped to the map). */
function bilinear(field: Float32Array, width: number, height: number, u: number, v: number): number {
  const at = (x: number, y: number) =>
    field[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))] ?? 1;
  const fx = Math.floor(u);
  const fy = Math.floor(v);
  const ax = u - fx;
  const ay = v - fy;
  return (at(fx, fy) * (1 - ax) + at(fx + 1, fy) * ax) * (1 - ay) + (at(fx, fy + 1) * (1 - ax) + at(fx + 1, fy + 1) * ax) * ay;
}

/** Edge value forced on grid points next to open tiles (just below the rock threshold). */
const OPEN_EDGE = 0.45;

/** True when an in-map open (non-cliff) tile overlaps the square of half-size r around (u, v). */
function touchesOpen(isCliff: CliffTest, width: number, height: number, u: number, v: number, r: number): boolean {
  for (let y = Math.floor(v - r + 0.5); y <= Math.floor(v + r + 0.5); y++) {
    for (let x = Math.floor(u - r + 0.5); x <= Math.floor(u + r + 0.5); x++) {
      if (x >= 0 && y >= 0 && x < width && y < height && !isCliff(x, y)) return true;
    }
  }
  return false;
}

export function buildRelief(isCliff: CliffTest, width: number, height: number, baseHeight: number, seed = 0, res = 8): Relief {
  const cols = width * res + 1;
  const rows = height * res + 1;
  const pass = findPasses(isCliff, width, height);
  const falloff = passFalloff(pass, width, height);
  const edge = new Float32Array(cols * rows);
  const top = new Float32Array(cols * rows);
  for (let b = 0; b < rows; b++) {
    for (let a = 0; a < cols; a++) {
      const u = a / res - 0.5;
      const v = b / res - 0.5;
      // The smooth share shapes long outlines; the bilinear one keeps thin cliffs (1–2 tiles) visible as rock.
      const w = tileShare(isCliff, width, height, u, v);
      const i = b * cols + a;
      // Full wobble along the rim, little deep inside (no pits in the plateau).
      // Near a pass the walls stand back from the lane and slope down to a saddle, so units in it stay visible.
      const nearPass = 1 - bilinear(falloff, width, height, u, v);
      const e = w - EROSION - 0.22 * nearPass + (fbm(u * 0.9, v * 0.9, seed + 301) - 0.5) * WOBBLE * (1 - 0.8 * w * w);
      // Rock never reaches into an open tile: every grid point a sample inside one interpolates from stays below 0.5.
      edge[i] = e > OPEN_EDGE && touchesOpen(isCliff, width, height, u, v, 1 / res) ? OPEN_EDGE : e;
      top[i] = baseHeight * (0.82 + 0.4 * fbm(u * 0.22, v * 0.22, seed + 307)) * (1 - 0.6 * nearPass);
    }
  }
  const near = new Uint8Array(width * height);
  for (let ty = 0; ty < height; ty++) {
    for (let tx = 0; tx < width; tx++) {
      if (!isCliff(tx, ty)) continue;
      for (let y = Math.max(0, ty - 2); y <= Math.min(height - 1, ty + 1); y++) {
        for (let x = Math.max(0, tx - 2); x <= Math.min(width - 1, tx + 1); x++) near[y * width + x] = 1;
      }
    }
  }
  return { width, height, res, isCliff, maxHeight: baseHeight * 1.22, edge, top, near, pass };
}

/** Bilinear sample of a relief grid at tile coordinates (u, v). */
export function sampleRelief(r: Relief, grid: Float32Array, u: number, v: number): number {
  const cols = r.width * r.res + 1;
  const rows = r.height * r.res + 1;
  const x = Math.min(cols - 1.001, Math.max(0, (u + 0.5) * r.res));
  const y = Math.min(rows - 1.001, Math.max(0, (v + 0.5) * r.res));
  const a = Math.floor(x);
  const b = Math.floor(y);
  const fx = x - a;
  const fy = y - b;
  const i = b * cols + a;
  const p = grid[i] ?? 0;
  const q = grid[i + 1] ?? 0;
  const s = grid[i + cols] ?? 0;
  const t = grid[i + cols + 1] ?? 0;
  return (p + (q - p) * fx) * (1 - fy) + (s + (t - s) * fx) * fy;
}

/** False when no cliff tile can be seen from, or stand right behind, ground point (u, v). */
export function nearCliff(r: Relief, u: number, v: number): boolean {
  const i = Math.floor(u + 0.5);
  const j = Math.floor(v + 0.5);
  // Off-map ground can still look at rim cliffs: test the clamped tile.
  const ci = i < 0 ? 0 : i >= r.width ? r.width - 1 : i;
  const cj = j < 0 ? 0 : j >= r.height ? r.height - 1 : j;
  if (i < -2 || j < -2 || i > r.width + 1 || j > r.height + 1) return false;
  return r.near[cj * r.width + ci] === 1;
}

/** True when rock stands on ground point (u, v) (the edge field alone decides; see OPEN_EDGE). */
export function rockAt(r: Relief, u: number, v: number): boolean {
  return sampleRelief(r, r.edge, u, v) > 0.5;
}

/**
 * The rock surface seen at the screen pixel whose ground point is (u, v),
 * or null for open ground. Marches the view diagonal (see cliffGeometry)
 * from above the highest plateau down to the ground, 1 px of height per
 * step: the first sample inside the rock is a top when the sample above
 * it already stood over rock, otherwise a face.
 */
export function marchRelief(r: Relief, u: number, v: number): ReliefHit | null {
  // Cheap reject: no cliff tile anywhere on the diagonal (it spans < 2 tiles).
  if (!nearCliff(r, u, v)) return null;
  const step = 1 / TILE_HEIGHT;
  let overRock = false;
  let h = Math.ceil(r.maxHeight) + 1;
  let prev = h + 1;
  while (h >= 0) {
    const pu = u + h * step;
    const pv = v + h * step;
    if (rockAt(r, pu, pv)) {
      const top = sampleRelief(r, r.top, pu, pv);
      if (h <= top) {
        // Stepped 2 px into a face: the pixel between may already be rock.
        if (!overRock && prev === h + 2) {
          const mu = pu + step;
          const mv = pv + step;
          if (rockAt(r, mu, mv) && h + 1 <= sampleRelief(r, r.top, mu, mv)) return hitOf('face', h + 1, mu, mv);
        }
        return hitOf(overRock ? 'top' : 'face', h, pu, pv);
      }
      // Above the plateau: drop straight to its height here (tops vary slowly).
      overRock = true;
      prev = h;
      h = Math.min(h - 1, Math.floor(top));
    } else {
      overRock = false;
      prev = h;
      h -= 2;
      if (h === -1) h = 0;
    }
  }
  return null;
}

function hitOf(surface: 'top' | 'face', h: number, u: number, v: number): ReliefHit {
  return { surface, tx: Math.floor(u + 0.5), ty: Math.floor(v + 0.5), h, u, v };
}

/** Gradient (per tile) of a relief grid at (u, v), by central differences. */
export function reliefGradient(r: Relief, grid: Float32Array, u: number, v: number): [number, number] {
  const e = 0.25;
  return [
    (sampleRelief(r, grid, u + e, v) - sampleRelief(r, grid, u - e, v)) / (2 * e),
    (sampleRelief(r, grid, u, v + e) - sampleRelief(r, grid, u, v - e)) / (2 * e),
  ];
}

/** Open-ground distance proxy (tiles) to the rock foot: 0 at the foot, growing outward. */
export function footDistance(r: Relief, u: number, v: number): number {
  return Math.max(0, 0.5 - sampleRelief(r, r.edge, u, v));
}
