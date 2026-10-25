/**
 * Pure colour + noise helpers shared by the procedural art generators.
 * Nothing in here touches the DOM, so it is unit-testable in Node.
 */

export type Rgb = readonly [number, number, number];

export function hexToRgb(hex: number): Rgb {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

export function rgbToHex([r, g, b]: Rgb): number {
  return (clampByte(r) << 16) | (clampByte(g) << 8) | clampByte(b);
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

/** Multiplies each channel by `factor` (>1 lightens, <1 darkens). */
export function shade(hex: number, factor: number): number {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([r * factor, g * factor, b * factor]);
}

/** Linear blend between two colours, t=0 → a, t=1 → b. */
export function mix(a: number, b: number, t: number): number {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex([
    ca[0] + (cb[0] - ca[0]) * t,
    ca[1] + (cb[1] - ca[1]) * t,
    ca[2] + (cb[2] - ca[2]) * t,
  ]);
}

export function css(hex: number, alpha = 1): string {
  const [r, g, b] = hexToRgb(hex);
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

/** Deterministic 2D integer hash → [0, 1). */
export function hash2(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Small seeded PRNG (mulberry32) for repeatable art. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth value noise in [0, 1). */
export function valueNoise(x: number, y: number, seed = 0): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Fractal noise, 3 octaves, normalised to [0, 1). */
export function fbm(x: number, y: number, seed = 0): number {
  return (
    valueNoise(x, y, seed) * 0.57 +
    valueNoise(x * 2.03, y * 2.03, seed + 1) * 0.29 +
    valueNoise(x * 4.1, y * 4.1, seed + 2) * 0.14
  );
}

/** Picks a stable variant index for a tile. */
export function tileVariant(tx: number, ty: number, count: number): number {
  return Math.floor(hash2(tx, ty, 7) * count) % count;
}
