import { decodeNormal, encodeNormal, normalize, N_UP, type Vec3 } from './viewSpace';

export interface DeriveOptions {
  /** Blur radius (px) of the silhouette "pillow" height field; 0 = flat. */
  readonly bulge: number;
  /** How strongly the pillow tilts normals at the silhouette edge. */
  readonly bulgeStrength: number;
  /** Tilt of the base normal towards world up (0 = faces viewer). */
  readonly upBias: number;
  /** Luminance bump strength (stone/plank/thatch micro detail). */
  readonly detail: number;
}

export const DEFAULT_DERIVE: DeriveOptions = { bulge: 6, bulgeStrength: 5, upBias: 0.35, detail: 1.4 };

/** Pixels below this alpha are ground-level (soft shadows): flat up normal. */
const SOLID_ALPHA = 0.55;

/**
 * Builds a normal map (RGBA bytes, same size) for painted albedo.
 *  - Where `faces` has alpha, its encoded normal is used (painter faces).
 *  - Elsewhere opaque pixels get a "pillow" normal from the blurred
 *    silhouette (sphere/cylinder-like volume for trees, units, rocks).
 *  - Semi-transparent ground pixels (baked contact shadows) face up.
 *  - Every solid pixel gets a luminance-gradient bump for texture.
 */
export function deriveNormals(
  albedo: Uint8ClampedArray,
  width: number,
  height: number,
  faces: Uint8ClampedArray | null,
  opts: DeriveOptions = DEFAULT_DERIVE,
): Uint8ClampedArray {
  const n = width * height;
  const mask = new Float32Array(n);
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = (albedo[i * 4 + 3] ?? 0) / 255;
    const solid = a >= SOLID_ALPHA ? 1 : 0;
    mask[i] = solid;
    const o = i * 4;
    lum[i] = solid * (((albedo[o] ?? 0) * 0.299 + (albedo[o + 1] ?? 0) * 0.587 + (albedo[o + 2] ?? 0) * 0.114) / 255);
  }
  const hgt = opts.bulge > 0 ? boxBlur(boxBlur(mask, width, height, opts.bulge), width, height, opts.bulge) : mask;
  const out = new Uint8ClampedArray(n * 4);
  const up = encodeNormal(N_UP);
  const at = (f: Float32Array, x: number, y: number) =>
    f[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))] ?? 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const o = i * 4;
      out[o + 3] = 255;
      if (!mask[i]) {
        out[o] = up[0];
        out[o + 1] = up[1];
        out[o + 2] = up[2];
        continue;
      }
      let base: Vec3;
      if (faces && (faces[o + 3] ?? 0) > 0) {
        base = decodeNormal(faces[o] ?? 128, faces[o + 1] ?? 128, faces[o + 2] ?? 255);
      } else {
        const gx = at(hgt, x + 1, y) - at(hgt, x - 1, y);
        const gy = at(hgt, x, y + 1) - at(hgt, x, y - 1);
        // y is down in the texture, up in view space.
        const p = normalize([-gx * opts.bulgeStrength, gy * opts.bulgeStrength, 1]);
        base = normalize([p[0] + N_UP[0] * opts.upBias, p[1] + N_UP[1] * opts.upBias, p[2] + N_UP[2] * opts.upBias]);
      }
      // Neighbours outside the silhouette reuse the centre value so the
      // edge itself does not read as a luminance cliff.
      const c = lum[i] ?? 0;
      const ln = (xx: number, yy: number) => (at(mask, xx, yy) ? at(lum, xx, yy) : c);
      const dx = ln(x + 1, y) - ln(x - 1, y);
      const dy = ln(x, y + 1) - ln(x, y - 1);
      const nrm = normalize([base[0] - dx * opts.detail, base[1] + dy * opts.detail, base[2]]);
      const [r, g, b] = encodeNormal(nrm);
      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
    }
  }
  return out;
}

/** Separable box blur with clamped edges (single pass each axis). */
export function boxBlur(src: Float32Array, width: number, height: number, radius: number): Float32Array {
  const r = Math.max(1, Math.round(radius));
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const span = r * 2 + 1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += src[row + Math.min(width - 1, Math.max(0, k))] ?? 0;
    for (let x = 0; x < width; x++) {
      tmp[row + x] = sum / span;
      sum += (src[row + Math.min(width - 1, x + r + 1)] ?? 0) - (src[row + Math.max(0, x - r)] ?? 0);
    }
  }
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += tmp[Math.min(height - 1, Math.max(0, k)) * width + x] ?? 0;
    for (let y = 0; y < height; y++) {
      out[y * width + x] = sum / span;
      sum +=
        (tmp[Math.min(height - 1, y + r + 1) * width + x] ?? 0) - (tmp[Math.max(0, y - r) * width + x] ?? 0);
    }
  }
  return out;
}
