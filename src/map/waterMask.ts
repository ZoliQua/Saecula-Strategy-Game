import { TERRAIN, type TerrainId } from './TerrainTypes';

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

/** Smoothed bilinear water weight at tile coordinates (u, v); matches terrain.ts. */
export function waterCoverage(map: WaterSource, u: number, v: number): number {
  const fx = Math.floor(u);
  const fy = Math.floor(v);
  const ax = u - fx;
  const ay = v - fy;
  const at = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= map.width || y >= map.height ? 0 : map.getTile(x, y) === TERRAIN.water ? 1 : 0;
  const top = at(fx, fy) * (1 - ax) + at(fx + 1, fy) * ax;
  const bot = at(fx, fy + 1) * (1 - ax) + at(fx + 1, fy + 1) * ax;
  return smooth(top * (1 - ay) + bot * ay);
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
