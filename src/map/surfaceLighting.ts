import { shadowVector, sunAt, sunDirection, type SunState } from '../iso/art/lighting/sun';
import type { Vec3 } from '../iso/art/lighting/viewSpace';

/** Uniform values of the terrain surface shader that follow the light (see TerrainSurface). */
export interface SurfaceLighting {
  readonly sunDir: Vec3;
  readonly glintDir: Vec3;
  readonly sunColor: Vec3;
  readonly ambient: Vec3;
  /** Shadow vector x, y and opacity of the plateau sun shadows. */
  readonly shadow: readonly [number, number, number];
  /** 1 = sun glints, sparkle and shadows on; 0 = the unlit (LIGHTING_ENABLED off) look. */
  readonly lit: 0 | 1;
}

/** Fixed daylight the water is shaded with when lighting is off (no cycle, no shadows, no glints). */
const UNLIT_SUN = sunAt(0.3);

/**
 * Light for the surface shader: the live sun when the scene's lighting
 * is active, else a fixed daylight with plateau shadows and specular off,
 * so the lighting toggle restores the baked look here too.
 */
export function surfaceLighting(sun: SunState, active: boolean, shadowAlpha: number): SurfaceLighting {
  const s = active ? sun : UNLIT_SUN;
  // Glints mirror the sun behind the scene, pulled towards the view axis so they show at any hour.
  const glintDir = sunDirection(270 - (s.azimuthDeg - 90) * 0.35, Math.max(18, s.elevationDeg));
  if (!active) return { sunDir: s.dir, glintDir, sunColor: s.color, ambient: s.ambient, shadow: [0, 0, 0], lit: 0 };
  const sv = shadowVector(s);
  return { sunDir: s.dir, glintDir, sunColor: s.color, ambient: s.ambient, shadow: [sv.x, sv.y, shadowAlpha * sv.strength], lit: 1 };
}
