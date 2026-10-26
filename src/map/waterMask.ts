import { TERRAIN, type TerrainId } from './TerrainTypes';
import { bilinearShare, tileShare } from './tileShare';

export interface WaterSource {
  readonly width: number;
  readonly height: number;
  getTile(tx: number, ty: number): TerrainId;
}

/**
 * Tile-space water field on the same vertex grid as the cliff relief:
 * point (a, b) sits at tile coordinates (a / res − 0.5, b / res − 0.5),
 * (width · res + 1) × (height · res + 1) points covering the map edge to edge.
 */
export interface WaterMask {
  readonly cols: number;
  readonly rows: number;
  readonly res: number;
  /** 0..1 water coverage, the same smoothed bilinear blend the terrain chunks paint. */
  readonly coverage: Float32Array;
  /** Distance (tiles) from the shore line (coverage 0.5); 0 on land. */
  readonly depth: Float32Array;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

const nearCache = new WeakMap<WaterSource, Uint8Array>();

/** Per tile: 1 when a water tile lies within two tiles (water never changes during a game). */
function nearWater(map: WaterSource): Uint8Array {
  const hit = nearCache.get(map);
  if (hit) return hit;
  const near = new Uint8Array(map.width * map.height);
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      if (map.getTile(tx, ty) !== TERRAIN.water) continue;
      for (let y = Math.max(0, ty - 2); y <= Math.min(map.height - 1, ty + 2); y++) {
        for (let x = Math.max(0, tx - 2); x <= Math.min(map.width - 1, tx + 2); x++) near[y * map.width + x] = 1;
      }
    }
  }
  nearCache.set(map, near);
  return near;
}

/**
 * 0..1 water coverage at tile coordinates (u, v): a flowing shore line
 * (tileShare) sharpened to about half a tile. Shared by the terrain
 * chunks (static water and wet sand) and the water shader's mask.
 */
export function waterCoverage(map: WaterSource, u: number, v: number): number {
  const fx = Math.floor(u + 0.5);
  const fy = Math.floor(v + 0.5);
  if (fx < -2 || fy < -2 || fx > map.width + 1 || fy > map.height + 1) return 0;
  // Fast path: no water tile within the kernel reach.
  const near = nearWater(map);
  if (near[Math.min(map.height - 1, Math.max(0, fy)) * map.width + Math.min(map.width - 1, Math.max(0, fx))] !== 1) return 0;
  const isWater = (x: number, y: number) => map.getTile(x, y) === TERRAIN.water;
  // The flowing outline may round off corners but never floods a land tile's centre (trees, units stand there).
  const share = Math.min(tileShare(isWater, map.width, map.height, u, v), bilinearShare(isWater, map.width, map.height, u, v) + 0.35);
  return smooth(Math.max(0, Math.min(1, (share - 0.3) / 0.4)));
}

/** True when the map has at least one water tile. */
export function hasWater(map: WaterSource): boolean {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) if (map.getTile(x, y) === TERRAIN.water) return true;
  }
  return false;
}

/** Builds coverage and shore distance (two-pass chamfer, texel steps 1 and √2). */
export function buildWaterMask(map: WaterSource, res: number): WaterMask {
  const cols = map.width * res + 1;
  const rows = map.height * res + 1;
  const coverage = new Float32Array(cols * rows);
  const dist = new Float32Array(cols * rows);
  for (let b = 0; b < rows; b++) {
    for (let a = 0; a < cols; a++) {
      const c = waterCoverage(map, a / res - 0.5, b / res - 0.5);
      const i = b * cols + a;
      coverage[i] = c;
      dist[i] = c < 0.5 ? 0 : Infinity;
    }
  }
  const D = Math.SQRT2;
  const relax = (i: number, j: number, w: number): void => {
    const d = (dist[j] ?? Infinity) + w;
    if (d < (dist[i] ?? 0)) dist[i] = d;
  };
  for (let b = 0; b < rows; b++) {
    for (let a = 0; a < cols; a++) {
      const i = b * cols + a;
      if (dist[i] === 0) continue;
      // The map border counts as shore.
      if (a === 0 || b === 0) dist[i] = Math.min(dist[i] ?? Infinity, 1);
      if (a > 0) relax(i, i - 1, 1);
      if (b > 0) {
        relax(i, i - cols, 1);
        if (a > 0) relax(i, i - cols - 1, D);
        if (a < cols - 1) relax(i, i - cols + 1, D);
      }
    }
  }
  for (let b = rows - 1; b >= 0; b--) {
    for (let a = cols - 1; a >= 0; a--) {
      const i = b * cols + a;
      if (dist[i] === 0) continue;
      if (a === cols - 1 || b === rows - 1) dist[i] = Math.min(dist[i] ?? Infinity, 1);
      if (a < cols - 1) relax(i, i + 1, 1);
      if (b < rows - 1) {
        relax(i, i + cols, 1);
        if (a < cols - 1) relax(i, i + cols + 1, D);
        if (a > 0) relax(i, i + cols - 1, D);
      }
    }
  }
  const depth = new Float32Array(cols * rows);
  for (let i = 0; i < depth.length; i++) depth[i] = (dist[i] ?? 0) / res;
  return { cols, rows, res, coverage, depth };
}

/** Depth as 0..1 of `deepTiles` (the shader's depth tint scale). */
export function depth01(mask: WaterMask, i: number, deepTiles: number): number {
  return Math.min(1, (mask.depth[i] ?? 0) / deepTiles);
}
