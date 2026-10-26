import type { Relief } from './cliffRelief';
import { depth01, type WaterMask } from './waterMask';

/** The edge field is stored as (edge − EDGE_MIN) / EDGE_SPAN in one byte. */
export const EDGE_MIN = -0.6;
export const EDGE_SPAN = 2.2;

/**
 * Packs the cliff relief and the water field (same vertex grid) into the
 * RGBA texture the terrain surface shader reads:
 *   R = rock edge field,
 *   G = plateau height / maxHeight where rock stands (edge > 0.5), else water depth (0..1 of deepTiles),
 *   B = water coverage, A = 255.
 * Alpha stays opaque: the mask goes through a 2D canvas, which stores
 * premultiplied colour and would lose RGB wherever alpha is low.
 */
export function packSurfaceMask(
  cols: number,
  rows: number,
  relief: Relief | null,
  water: WaterMask | null,
  deepTiles: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(cols * rows * 4);
  const byte = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 255);
  for (let i = 0; i < cols * rows; i++) {
    const o = i * 4;
    const edge = relief ? (relief.edge[i] ?? EDGE_MIN) : EDGE_MIN;
    out[o] = byte((edge - EDGE_MIN) / EDGE_SPAN);
    if (relief && edge > 0.5) out[o + 1] = byte((relief.top[i] ?? 0) / relief.maxHeight);
    else out[o + 1] = water ? byte(depth01(water, i, deepTiles)) : 0;
    out[o + 2] = water ? byte(water.coverage[i] ?? 0) : 0;
    out[o + 3] = 255;
  }
  return out;
}

/** Decodes the edge byte (shader mirror, for tests). */
export function unpackEdge(byte: number): number {
  return (byte / 255) * EDGE_SPAN + EDGE_MIN;
}
