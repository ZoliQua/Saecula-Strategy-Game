/** A half-resolution RGBA image. */
export interface HalfImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray<ArrayBuffer>;
}

/**
 * Halves a unit's team mask (each side rounded up) for the GPU: alpha is
 * the 2×2 block's mean coverage, colour the alpha-weighted mean, so the
 * transparent texels around a team-coloured part add no dark fringe when
 * the sprite samples it with linear filtering (texture memory budget: a
 * quarter of the bytes; the mask sprite keeps the albedo's UVs).
 */
export function halveMask(src: Uint8ClampedArray, width: number, height: number): HalfImage {
  const hw = Math.ceil(width / 2);
  const hh = Math.ceil(height / 2);
  const data = new Uint8ClampedArray(hw * hh * 4);
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < hw; x++) {
      let n = 0;
      let a = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      for (let dy = 0; dy < 2; dy++) {
        const sy = y * 2 + dy;
        if (sy >= height) continue;
        for (let dx = 0; dx < 2; dx++) {
          const sx = x * 2 + dx;
          if (sx >= width) continue;
          const k = (sy * width + sx) * 4;
          const alpha = src[k + 3] ?? 0;
          n++;
          a += alpha;
          r += (src[k] ?? 0) * alpha;
          g += (src[k + 1] ?? 0) * alpha;
          b += (src[k + 2] ?? 0) * alpha;
        }
      }
      if (a === 0) continue;
      const o = (y * hw + x) * 4;
      data[o] = Math.round(r / a);
      data[o + 1] = Math.round(g / a);
      data[o + 2] = Math.round(b / a);
      data[o + 3] = Math.round(a / n);
    }
  }
  return { width: hw, height: hh, data };
}
