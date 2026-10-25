import { MaterialTable, type Material } from './materials';
import type { Prim } from './primitives';
import { applyDir, applyPoint, compose, cross, dot, IDENTITY, norm, scale, type V3, type Xform } from './rigMath';

/** Local frame (unit axes) for oriented parts, in the current part space. */
export type Axes = readonly [V3, V3, V3];

/** Keep the side of the plane through `at` that `n` points to (rig space). */
export interface ClipRig {
  readonly n: V3;
  readonly at: V3;
}

/**
 * Collects a figure's primitives. Parts are given in rig space (x
 * forward, y left, z up) relative to the current placement, then
 * converted once into view space through the heading basis.
 */
export class Figure {
  readonly prims: Prim[] = [];
  readonly mats = new MaterialTable();
  private m: Xform;
  private readonly basis: Xform;

  /** `size` scales the whole figure (rig px → art px). */
  constructor(basis: Xform, private readonly size = 1) {
    const k = size;
    this.basis = { x: scale(basis.x, k), y: scale(basis.y, k), z: scale(basis.z, k), t: basis.t };
    this.m = this.basis;
  }

  /** Places everything added next (death falls, rider on a horse). */
  place(local: Xform = IDENTITY): void {
    this.m = compose(this.basis, local);
  }

  private p(v: V3): V3 {
    return applyPoint(this.m, v);
  }

  private d(v: V3): V3 {
    return applyDir(this.m, v);
  }

  private clip(c: ClipRig | undefined): { clip?: { n: V3; d: number } } {
    if (!c) return {};
    const n = norm(this.d(c.n));
    return { clip: { n, d: dot(n, this.p(c.at)) } };
  }

  sphere(c: V3, r: number, mat: Material, clip?: ClipRig): void {
    this.prims.push({ kind: 'sphere', c: this.p(c), r: r * this.size, mat: this.mats.id(mat), ...this.clip(clip) });
  }

  ellipsoid(c: V3, axes: Axes, radii: V3, mat: Material, clip?: ClipRig): void {
    this.prims.push({
      kind: 'ellipsoid',
      c: this.p(c),
      ax: norm(this.d(axes[0])),
      ay: norm(this.d(axes[1])),
      az: norm(this.d(axes[2])),
      rx: radii[0] * this.size,
      ry: radii[1] * this.size,
      rz: radii[2] * this.size,
      mat: this.mats.id(mat),
      ...this.clip(clip),
    });
  }

  capsule(a: V3, b: V3, r: number, mat: Material, clip?: ClipRig): void {
    this.prims.push({ kind: 'capsule', a: this.p(a), b: this.p(b), r: r * this.size, mat: this.mats.id(mat), ...this.clip(clip) });
  }

  cone(a: V3, b: V3, ra: number, rb: number, mat: Material, clip?: ClipRig): void {
    this.prims.push({ kind: 'cone', a: this.p(a), b: this.p(b), ra: ra * this.size, rb: rb * this.size, mat: this.mats.id(mat), ...this.clip(clip) });
  }

  box(c: V3, axes: Axes, half: V3, mat: Material, clip?: ClipRig): void {
    this.prims.push({
      kind: 'box',
      c: this.p(c),
      ax: norm(this.d(axes[0])),
      ay: norm(this.d(axes[1])),
      az: norm(this.d(axes[2])),
      hx: half[0] * this.size,
      hy: half[1] * this.size,
      hz: half[2] * this.size,
      mat: this.mats.id(mat),
      ...this.clip(clip),
    });
  }
}

/** Orthonormal axes with x along `dir` and y as close as possible to `side`. */
export function axesAlong(dir: V3, side: V3): Axes {
  const x = norm(dir);
  let z = cross(x, side);
  if (Math.hypot(z[0], z[1], z[2]) < 1e-5) z = cross(x, [0, 0, 1]);
  z = norm(z);
  const y = cross(z, x);
  return [x, y, z];
}
