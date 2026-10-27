import type { Vec3 } from './viewSpace';

/** The directional part of the IsoLight2D shader: a sun over an ambient term. */
export interface SunLight {
  /** Unit view-space vector towards the sun. */
  readonly dir: Vec3;
  readonly color: Vec3;
  readonly ambient: Vec3;
}

/**
 * Lights painted art on the CPU the way IsoLightPipeline does on the GPU
 * (`albedo × (ambient + sun × max(n·L, 0))`, point lights left out), for
 * DOM previews. `albedo` and `normals` are same-sized RGBA buffers; a
 * pixel with no normal faces the viewer.
 */
export function shadePixels(albedo: Uint8ClampedArray, normals: Uint8ClampedArray, sun: SunLight): Uint8ClampedArray {
  const out = new Uint8ClampedArray(albedo.length);
  const [lx, ly, lz] = sun.dir;
  for (let i = 0; i < albedo.length; i += 4) {
    const a = albedo[i + 3] ?? 0;
    out[i + 3] = a;
    if (a === 0) continue;
    let nx = 0;
    let ny = 0;
    let nz = 1;
    if ((normals[i + 3] ?? 0) > 0) {
      nx = (normals[i] ?? 128) / 127.5 - 1;
      ny = (normals[i + 1] ?? 128) / 127.5 - 1;
      nz = (normals[i + 2] ?? 255) / 127.5 - 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
    }
    const lambert = Math.max(0, nx * lx + ny * ly + nz * lz);
    for (let c = 0; c < 3; c++) {
      out[i + c] = (albedo[i + c] ?? 0) * ((sun.ambient[c] ?? 0) + (sun.color[c] ?? 0) * lambert);
    }
  }
  return out;
}
