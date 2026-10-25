/**
 * View-space vector math shared by normal maps, the sun and shadows.
 *
 * View space: x = screen right, y = screen UP, z = towards the viewer.
 * The 2:1 isometric camera looks down at 30°, so:
 *   world up             → (0, cos30, sin30)
 *   world "towards view" → (0, -sin30, cos30)   (horizontal, screen-down)
 *   world "screen right" → (1, 0, 0)            (horizontal)
 * Tile axes: +u (tile x, screen down-right) and +v (tile y, screen
 * down-left) are the horizontal diagonals between those.
 */

export type Vec3 = readonly [number, number, number];

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;

export function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Converts a world vector given as (right, towards, up) components
 * into view space. `right` / `towards` are horizontal, `up` vertical.
 */
export function worldToView(right: number, towards: number, up: number): Vec3 {
  return [right, -SIN30 * towards + COS30 * up, COS30 * towards + SIN30 * up];
}

/** World vector in tile axes (u, v horizontal, z up) → view space. */
export function tileToView(u: number, v: number, z: number): Vec3 {
  const s = Math.SQRT1_2;
  return worldToView((u - v) * s, (u + v) * s, z);
}

/** Flat ground / roof tops. */
export const N_UP: Vec3 = normalize(worldToView(0, 0, 1));
/** Wall facing +v (the painter's "left" face, screen down-left). */
export const N_LEFT: Vec3 = normalize(tileToView(0, 1, 0));
/** Wall facing +u (the painter's "right" face, screen down-right). */
export const N_RIGHT: Vec3 = normalize(tileToView(1, 0, 0));
/** Faces pointing straight at the camera (billboards). */
export const N_VIEW: Vec3 = [0, 0, 1];

/**
 * Normal of a sloped plane (roof) that descends horizontally along tile
 * direction (du, dv) by `rise` world units over `run` world units.
 */
export function slopeNormal(du: number, dv: number, run: number, rise: number): Vec3 {
  const h = normalize(tileToView(du, dv, 0));
  return normalize([
    h[0] * rise + N_UP[0] * run,
    h[1] * rise + N_UP[1] * run,
    h[2] * rise + N_UP[2] * run,
  ]);
}

/** Horizontal view direction for a cylinder at angle θ (−90° left … +90° right). */
export function cylinderNormal(theta: number): Vec3 {
  return normalize(worldToView(Math.sin(theta), Math.cos(theta), 0));
}

/** Encodes a unit normal as an RGB byte triple (OpenGL convention). */
export function encodeNormal(n: Vec3): [number, number, number] {
  return [
    Math.round((n[0] * 0.5 + 0.5) * 255),
    Math.round((n[1] * 0.5 + 0.5) * 255),
    Math.round((n[2] * 0.5 + 0.5) * 255),
  ];
}

export function decodeNormal(r: number, g: number, b: number): Vec3 {
  return [(r / 255) * 2 - 1, (g / 255) * 2 - 1, (b / 255) * 2 - 1];
}

/** CSS colour string of an encoded normal (for canvas fills). */
export function normalCss(n: Vec3): string {
  const [r, g, b] = encodeNormal(n);
  return `rgb(${r},${g},${b})`;
}

/** Painted art px of height per world unit of height (vertical foreshortening). */
export const SCREEN_PER_WORLD_HEIGHT = COS30;
/** Screen-down px per world unit moved towards the viewer. */
export const SCREEN_PER_WORLD_DEPTH = SIN30;
