import type { V3 } from './rigMath';

/**
 * Solid primitives the unit rig is built from, in VIEW space (x right,
 * y up, z towards the viewer). The rasterizer shoots one orthographic
 * ray per sample straight into the screen (direction −z) and keeps the
 * hit closest to the viewer, so every function here answers "where does
 * the vertical line through (X, Y) first touch this solid?".
 */

/** Keeps only surface points p with n·p ≥ d (open helmets, hoods). */
export interface Plane {
  readonly n: V3;
  readonly d: number;
}

interface Base {
  /** Material index (see materials.ts). */
  readonly mat: number;
  readonly clip?: Plane;
}

export type Prim =
  | (Base & { readonly kind: 'sphere'; readonly c: V3; readonly r: number })
  | (Base & {
      readonly kind: 'ellipsoid';
      readonly c: V3;
      /** Unit axes and radii. */
      readonly ax: V3;
      readonly ay: V3;
      readonly az: V3;
      readonly rx: number;
      readonly ry: number;
      readonly rz: number;
    })
  | (Base & { readonly kind: 'capsule'; readonly a: V3; readonly b: V3; readonly r: number })
  | (Base & { readonly kind: 'cone'; readonly a: V3; readonly b: V3; readonly ra: number; readonly rb: number })
  | (Base & {
      readonly kind: 'box';
      readonly c: V3;
      readonly ax: V3;
      readonly ay: V3;
      readonly az: V3;
      /** Half extents along ax / ay / az. */
      readonly hx: number;
      readonly hy: number;
      readonly hz: number;
    });

/** Mutable hit record (reused to avoid per-sample allocation). */
export interface Hit {
  z: number;
  nx: number;
  ny: number;
  nz: number;
  /** Surface parameter 0..1 along the primitive's main axis (local z for ellipsoids), for bands. */
  u: number;
  /** Ellipsoids: local across (l2) and front (l1) coordinates, −1..1, for heraldic charges; else 0 / −1. */
  v: number;
  f: number;
  /** True when the visible surface is the inside of a clipped shell. */
  back: boolean;
}

export function newHit(): Hit {
  return { z: 0, nx: 0, ny: 0, nz: 1, u: 0, v: 0, f: -1, back: false };
}

/** Screen-space (view XY) bounds of a primitive. */
export function primBounds(p: Prim): { x0: number; x1: number; y0: number; y1: number } {
  switch (p.kind) {
    case 'sphere':
      return { x0: p.c[0] - p.r, x1: p.c[0] + p.r, y0: p.c[1] - p.r, y1: p.c[1] + p.r };
    case 'ellipsoid': {
      const ex = Math.hypot(p.ax[0] * p.rx, p.ay[0] * p.ry, p.az[0] * p.rz);
      const ey = Math.hypot(p.ax[1] * p.rx, p.ay[1] * p.ry, p.az[1] * p.rz);
      return { x0: p.c[0] - ex, x1: p.c[0] + ex, y0: p.c[1] - ey, y1: p.c[1] + ey };
    }
    case 'capsule':
    case 'cone': {
      const r = p.kind === 'capsule' ? p.r : Math.max(p.ra, p.rb);
      return {
        x0: Math.min(p.a[0], p.b[0]) - r,
        x1: Math.max(p.a[0], p.b[0]) + r,
        y0: Math.min(p.a[1], p.b[1]) - r,
        y1: Math.max(p.a[1], p.b[1]) + r,
      };
    }
    case 'box': {
      const ex = Math.abs(p.ax[0] * p.hx) + Math.abs(p.ay[0] * p.hy) + Math.abs(p.az[0] * p.hz);
      const ey = Math.abs(p.ax[1] * p.hx) + Math.abs(p.ay[1] * p.hy) + Math.abs(p.az[1] * p.hz);
      return { x0: p.c[0] - ex, x1: p.c[0] + ex, y0: p.c[1] - ey, y1: p.c[1] + ey };
    }
  }
}
