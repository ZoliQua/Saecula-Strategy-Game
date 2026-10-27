/** A half-resolution normal map (RGBA bytes, alpha 255). */
export interface HalfNormals {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray<ArrayBuffer>;
}

/**
 * Halves a normal map (each side rounded up): every output texel is the
 * renormalised mean of its 2×2 source normals. With `covered` (source
 * pixel index → coverage), only covered pixels count, so a silhouette edge
 * keeps the figure's normal instead of mixing in the ground behind it.
 *
 * Lighting reads normals with the albedo's own texture coordinates, so a
 * half-size map lines up as long as frame rectangles sit on even pixels;
 * it costs a quarter of the memory and the shading is visually the same
 * (normals are smooth at that scale).
 */
export function halveNormals(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  covered: ((i: number) => number) | null,
): HalfNormals {
  const hw = Math.ceil(width / 2);
  const hh = Math.ceil(height / 2);
  const data = new Uint8ClampedArray(hw * hh * 4);
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < hw; x++) {
      let wx = 0;
      let wy = 0;
      let wz = 0;
      let ax = 0;
      let ay = 0;
      let az = 0;
      for (let dy = 0; dy < 2; dy++) {
        const sy = y * 2 + dy;
        if (sy >= height) continue;
        for (let dx = 0; dx < 2; dx++) {
          const sx = x * 2 + dx;
          if (sx >= width) continue;
          const i = sy * width + sx;
          const k = i * 4;
          const nx = (src[k] ?? 0) / 127.5 - 1;
          const ny = (src[k + 1] ?? 0) / 127.5 - 1;
          const nz = (src[k + 2] ?? 0) / 127.5 - 1;
          ax += nx;
          ay += ny;
          az += nz;
          const c = covered ? covered(i) : 1;
          wx += nx * c;
          wy += ny * c;
          wz += nz * c;
        }
      }
      // Nothing covered (background): the plain mean.
      if (wx === 0 && wy === 0 && wz === 0) {
        wx = ax;
        wy = ay;
        wz = az;
      }
      const l = Math.hypot(wx, wy, wz) || 1;
      const o = (y * hw + x) * 4;
      data[o] = (wx / l) * 127.5 + 127.5;
      data[o + 1] = (wy / l) * 127.5 + 127.5;
      data[o + 2] = (wz / l) * 127.5 + 127.5;
      data[o + 3] = 255;
    }
  }
  return { width: hw, height: hh, data };
}
