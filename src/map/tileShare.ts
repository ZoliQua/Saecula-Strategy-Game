/** A per-tile yes/no question (cliff? water?). Off-map tiles are never asked. */
export type TileTest = (tx: number, ty: number) => boolean;

/** Radius (tiles) of the smoothing kernel that turns the tile staircase into a flowing outline. */
const SMOOTH_RADIUS = 1.5;

/**
 * Kernel-weighted share of matching tiles around tile point (u, v): 1 deep
 * inside a region, 0.5 on a straight edge, a smooth ramp along diagonal
 * staircases (so outlines flow instead of zig-zagging). Off-map tiles are
 * left out (the map rim stays neutral).
 */
export function smoothShare(test: TileTest, width: number, height: number, u: number, v: number, radius = SMOOTH_RADIUS): number {
  let sum = 0;
  let total = 0;
  for (let y = Math.ceil(v - radius); y <= Math.floor(v + radius); y++) {
    for (let x = Math.ceil(u - radius); x <= Math.floor(u + radius); x++) {
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const d2 = ((x - u) ** 2 + (y - v) ** 2) / (radius * radius);
      if (d2 >= 1) continue;
      const k = (1 - d2) * (1 - d2);
      total += k;
      if (test(x, y)) sum += k;
    }
  }
  return total > 0 ? sum / total : 0;
}

/** Bilinear share between the four tile centres around (u, v) (off-map counts as no). */
export function bilinearShare(test: TileTest, width: number, height: number, u: number, v: number): number {
  const fx = Math.floor(u);
  const fy = Math.floor(v);
  const ax = u - fx;
  const ay = v - fy;
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < width && y < height && test(x, y) ? 1 : 0);
  return (at(fx, fy) * (1 - ax) + at(fx + 1, fy) * ax) * (1 - ay) + (at(fx, fy + 1) * (1 - ax) + at(fx + 1, fy + 1) * ax) * ay;
}

/**
 * The share used for outlines: the smooth kernel shapes long edges, the
 * bilinear term keeps thin features (1–2 tiles) from vanishing.
 */
export function tileShare(test: TileTest, width: number, height: number, u: number, v: number): number {
  return Math.max(smoothShare(test, width, height, u, v), 0.95 * bilinearShare(test, width, height, u, v));
}
