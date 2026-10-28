import type { IsoPainter } from '../../isoPainter';
import { baked } from '../../lighting/normalLayer';
import { N_LEFT, N_RIGHT, N_UP } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';

type Pt = readonly [number, number];

/*
 * Swallowtail (Ghibelline) merlons, kit for Italian buildings and walls:
 * each merlon is cut at the top into two horns round a V notch, so the
 * skyline reads forked, not square. A crown is a coped parapet with a
 * row of merlons, painted in two halves round a platform's contents
 * (back edges first, front edges last).
 */

export interface SwallowtailOpts {
  /** Wall colour of the parapet and merlons. */
  readonly color: number;
  /** Coping / top colour; default a lighter shade of the wall. */
  readonly cap?: number;
  /** Solid parapet under the merlons (art px); default 5. */
  readonly parapet?: number;
  /** Merlon height up to the bottom of the notch (art px); default 7. */
  readonly body?: number;
  /** Depth of the V notch (art px); default 6. */
  readonly horn?: number;
  /** Merlon width along the run (tiles); default 0.13. */
  readonly width?: number;
  /** Gap between merlons (tiles); default 0.09. */
  readonly gap?: number;
  /** Parapet thickness (tiles); default 0.05. */
  readonly thickness?: number;
}

const fill = (p: IsoPainter, pts: Pt[], color: number, light: number, normal: typeof N_UP) => {
  p.fillPoly(pts, css(shade(color, light)));
  p.normals.fill(pts, normal);
};

/**
 * One merlon on a run along u (`axis` 'u', at v0..v0+t from u to u+a) or
 * along v (`axis` 'v', at u0..u0+t from v to v+a), base at z.
 */
function merlon(p: IsoPainter, axis: 'u' | 'v', s: number, at: number, t: number, a: number, z: number, body: number, horn: number, color: number, cap: number): void {
  const zt = z + body + horn;
  const zn = z + body;
  const m = s + a / 2;
  if (axis === 'u') {
    const v1 = at + t;
    fill(p, [p.p(s, at, zt), p.p(s, v1, zt), p.p(m, v1, zn), p.p(m, at, zn)], cap, 1.0, N_UP);
    fill(p, [p.p(m, at, zn), p.p(m, v1, zn), p.p(s + a, v1, zt), p.p(s + a, at, zt)], cap, baked(0.86), N_UP);
    fill(p, [p.p(s + a, v1, z), p.p(s + a, at, z), p.p(s + a, at, zt), p.p(s + a, v1, zt)], color, baked(0.72), N_RIGHT);
    const front: Pt[] = [p.p(s, v1, z), p.p(s + a, v1, z), p.p(s + a, v1, zt), p.p(m, v1, zn), p.p(s, v1, zt)];
    fill(p, front, color, 1.0, N_LEFT);
    p.strokePoly(front, css(shade(color, 0.45), 0.55), 1);
    p.addVolumePoint(s, v1, zt);
    p.addVolumePoint(s + a, v1, zt);
  } else {
    const u1 = at + t;
    fill(p, [p.p(at, s, zt), p.p(u1, s, zt), p.p(u1, m, zn), p.p(at, m, zn)], cap, baked(0.9), N_UP);
    fill(p, [p.p(at, m, zn), p.p(u1, m, zn), p.p(u1, s + a, zt), p.p(at, s + a, zt)], cap, 1.0, N_UP);
    fill(p, [p.p(at, s + a, z), p.p(u1, s + a, z), p.p(u1, s + a, zt), p.p(at, s + a, zt)], color, 1.0, N_LEFT);
    const side: Pt[] = [p.p(u1, s + a, z), p.p(u1, s, z), p.p(u1, s, zt), p.p(u1, m, zn), p.p(u1, s + a, zt)];
    fill(p, side, color, baked(0.72), N_RIGHT);
    p.strokePoly(side, css(shade(color, 0.35), 0.55), 1);
    p.addVolumePoint(u1, s, zt);
    p.addVolumePoint(u1, s + a, zt);
  }
}

/** Merlon starts along a run from `from` to `to`, evenly spread with the ends filled. */
function starts(from: number, to: number, a: number, gap: number): number[] {
  const n = Math.max(1, Math.round((to - from + gap) / (a + gap)));
  const step = n > 1 ? (to - from - a) / (n - 1) : 0;
  return Array.from({ length: n }, (_, i) => from + i * step);
}

/**
 * Row of swallowtail merlons on a coped parapet along one edge: `axis`
 * 'u' runs from u = from to u = to at v = at (thickness toward +v),
 * 'v' runs along v at u = at. Base of the parapet at z.
 */
export function swallowtailRun(p: IsoPainter, axis: 'u' | 'v', from: number, to: number, at: number, z: number, o: SwallowtailOpts): void {
  const t = o.thickness ?? 0.05;
  const h = o.parapet ?? 5;
  const cap = o.cap ?? shade(o.color, 1.12);
  const a = o.width ?? 0.13;
  if (h > 0) {
    if (axis === 'u') p.box(from, at, to, at + t, z, z + h, { color: o.color }, cap);
    else p.box(at, from, at + t, to, z, z + h, { color: o.color }, cap);
  }
  // Back to front: along u the far end is the low u, along v the low v.
  for (const s of starts(from, to, a, o.gap ?? 0.09)) merlon(p, axis, s, at, t, a, z + h, o.body ?? 7, o.horn ?? 6, o.color, cap);
}

/**
 * Swallowtail crown round a square platform u0..u1 × v0..v1 at z: 'back'
 * paints the two far edges (before the platform's contents), 'front' the
 * two near edges (after them).
 */
export function swallowtailCrown(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, z: number, side: 'back' | 'front', o: SwallowtailOpts): void {
  const t = o.thickness ?? 0.05;
  if (side === 'back') {
    swallowtailRun(p, 'u', u0, u1, v0, z, o);
    swallowtailRun(p, 'v', v0 + t, v1, u0, z, o);
  } else {
    swallowtailRun(p, 'u', u0, u1 - t, v1 - t, z, o);
    swallowtailRun(p, 'v', v0, v1, u1 - t, z, o);
  }
}
