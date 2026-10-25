import type { Direction } from '../../../types';
import { tileToView } from '../lighting/viewSpace';

/**
 * Small 3D vector toolkit for the unit rig.
 *
 * Rig space: x = forward, y = the figure's left, z = up, units = art px
 * (the sprite canvas is painted at ART_SCALE). A heading basis maps rig
 * space into view space (x right, y up, z towards the viewer, see
 * viewSpace.ts), where the orthographic rasterizer works.
 */
export type V3 = [number, number, number];

export const v3 = (x: number, y: number, z: number): V3 => [x, y, z];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
export const lerp = (a: V3, b: V3, t: number): V3 => add(a, scale(sub(b, a), t));
/** a + b·k */
export const madd = (a: V3, b: V3, k: number): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

export function cross(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function norm(a: V3): V3 {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}

/** Rotates `v` about the unit `axis` by `angle` (right-handed, Rodrigues). */
export function rotate(v: V3, axis: V3, angle: number): V3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const k = cross(axis, v);
  const d = dot(axis, v) * (1 - c);
  return [v[0] * c + k[0] * s + axis[0] * d, v[1] * c + k[1] * s + axis[1] * d, v[2] * c + k[2] * s + axis[2] * d];
}

/** Any unit vector perpendicular to the unit vector `a`. */
export function perpendicular(a: V3): V3 {
  const helper: V3 = Math.abs(a[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  return norm(cross(a, helper));
}

/** Rigid transform p' = R·p + t; R is stored as its three column vectors. */
export interface Xform {
  readonly x: V3;
  readonly y: V3;
  readonly z: V3;
  readonly t: V3;
}

export const IDENTITY: Xform = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1], t: [0, 0, 0] };

export function applyDir(m: Xform, d: V3): V3 {
  return [
    m.x[0] * d[0] + m.y[0] * d[1] + m.z[0] * d[2],
    m.x[1] * d[0] + m.y[1] * d[1] + m.z[1] * d[2],
    m.x[2] * d[0] + m.y[2] * d[1] + m.z[2] * d[2],
  ];
}

export function applyPoint(m: Xform, p: V3): V3 {
  return add(applyDir(m, p), m.t);
}

/** a ∘ b (b first, then a). */
export function compose(a: Xform, b: Xform): Xform {
  return { x: applyDir(a, b.x), y: applyDir(a, b.y), z: applyDir(a, b.z), t: applyPoint(a, b.t) };
}

/** Rotation about `axis` through `pivot`. */
export function rotationAbout(pivot: V3, axis: V3, angle: number): Xform {
  const x = rotate([1, 0, 0], axis, angle);
  const y = rotate([0, 1, 0], axis, angle);
  const z = rotate([0, 0, 1], axis, angle);
  const m = { x, y, z, t: [0, 0, 0] as V3 };
  return { x, y, z, t: sub(pivot, applyDir(m, pivot)) };
}

export function translation(t: V3): Xform {
  return { ...IDENTITY, t };
}

/** Tile-space unit vector (du along +tx, dv along +ty) of a compass heading. */
export const HEADING_TILE: Record<Direction, readonly [number, number]> = {
  N: [0, -1],
  NE: [Math.SQRT1_2, -Math.SQRT1_2],
  E: [1, 0],
  SE: [Math.SQRT1_2, Math.SQRT1_2],
  S: [0, 1],
  SW: [-Math.SQRT1_2, Math.SQRT1_2],
  W: [-1, 0],
  NW: [-Math.SQRT1_2, -Math.SQRT1_2],
};

/**
 * Rig → view transform for a figure facing `dir` (tile compass, as
 * movable.facing / directionFromDelta use it: E = +tx = screen
 * down-right). Tile axes are left-handed on screen, so the figure's
 * left is (dv, −du) in tile space.
 */
export function headingBasis(dir: Direction): Xform {
  const [du, dv] = HEADING_TILE[dir];
  return {
    x: [...tileToView(du, dv, 0)] as V3,
    y: [...tileToView(dv, -du, 0)] as V3,
    z: [...tileToView(0, 0, 1)] as V3,
    t: [0, 0, 0],
  };
}

/**
 * Two-bone IK: the middle joint (elbow / knee) for a chain from `root`
 * to `target` with bone lengths l1, l2, bending towards `pole`
 * (a direction). Unreachable targets straighten the chain; `end` is
 * where the chain actually reaches.
 */
export function ik2(root: V3, target: V3, l1: number, l2: number, pole: V3): { mid: V3; end: V3 } {
  const d = sub(target, root);
  const dist = Math.min(Math.max(len(d), 1e-4), l1 + l2 - 1e-4);
  const dir = norm(d);
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let bend = sub(pole, scale(dir, dot(pole, dir)));
  if (len(bend) < 1e-5) bend = perpendicular(dir);
  return { mid: madd(madd(root, dir, a), norm(bend), h), end: madd(root, dir, dist) };
}
