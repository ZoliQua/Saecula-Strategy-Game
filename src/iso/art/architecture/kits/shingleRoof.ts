import type { IsoPainter } from '../../isoPainter';
import { lerp } from '../../isoProps';
import { baked } from '../../lighting/normalLayer';
import { N_LEFT, N_RIGHT } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';

type Pt = readonly [number, number];

/*
 * Shingle roof kit: the wooden roofs of northern towns, laid in split
 * shingles (the caller's painter material, usually 'shingle').
 * - brokenGable: a gambrel (broken gable) whose steep lower slopes break
 *   to shallow upper ones, the gable end a pentagon with trimmed verges;
 *   the low, wide manor and barn profile.
 * - bellRoof: a square bell (ogee) roof — a flared, concave foot rising
 *   into a convex shoulder — on belfries and their lanterns.
 */

export interface BrokenGableOpts {
  /** Overhang past the walls (tiles). */
  readonly overhang?: number;
  /** Where the slopes break, as a fraction of the half-width from the eave (0.3 = a third in). */
  readonly breakAt?: number;
  /** Verge and curb boards in this colour (white trim). */
  readonly trim?: number;
  /** Face-local painter for the gable pentagon (x along the face, y up as negatives). */
  readonly gable?: (w: number, h: number) => void;
}

/**
 * Gambrel roof over u0..u1 × v0..v1 from `eave`: steep lower slopes
 * rising `lower` art px to the break, shallow upper slopes `upper` more
 * to the ridge along `axis`. The gable end facing the viewer is at u1
 * (axis 'u') or v1 (axis 'v'). Returns the ridge height.
 */
export function brokenGable(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, eave: number, lower: number, upper: number, color: number, wall: number, axis: 'u' | 'v', o: BrokenGableOpts = {}): number {
  const ov = o.overhang ?? 0.08;
  const along = axis === 'u';
  const [a0, a1] = along ? [u0 - ov, u1 + ov] : [v0 - ov, v1 + ov];
  const [b0, b1] = along ? [v0 - ov, v1 + ov] : [u0 - ov, u1 + ov];
  const [w0, w1] = along ? [v0, v1] : [u0, u1];
  const aw = along ? u1 : v1;
  const bm = (b0 + b1) / 2;
  const half = bm - b0;
  const k = o.breakAt ?? 0.3;
  const zb = eave + lower;
  const top = zb + upper;
  const pt = (a: number, b: number, z: number): Pt => (along ? p.p(a, b, z) : p.p(b, a, z));
  const slope = (side: number, run: number, rise: number) => (along ? p.slope(0, side, run, rise) : p.slope(side, 0, run, rise));
  const backLight = along ? baked(0.8) : baked(0.86);
  const frontLight = along ? baked(1.05) : baked(0.78);
  // Profile points across b: eave, break, ridge (back side, then front side).
  const bBackBreak = b0 + half * k;
  const bFrontBreak = b1 - half * k;
  const quad = (bA: number, zA: number, bB: number, zB: number): Pt[] => [pt(a0, bA, zA), pt(a1, bA, zA), pt(a1, bB, zB), pt(a0, bB, zB)];
  const backLow = quad(b0, eave, bBackBreak, zb);
  const backUp = quad(bBackBreak, zb, bm, top);
  p.fillPoly(backLow, css(shade(color, backLight * 0.95)));
  p.normals.fill(backLow, slope(-1, half * k, lower));
  p.fillPoly(backUp, css(shade(color, backLight)));
  p.normals.fill(backUp, slope(-1, half * (1 - k), upper));
  // Gable pentagon in the wall plane.
  const gablePts: Pt[] = [pt(aw, w0, eave), pt(aw, w1, eave), pt(aw, bFrontBreak, zb), pt(aw, bm, top), pt(aw, bBackBreak, zb)];
  p.fillPoly(gablePts, css(shade(wall, along ? baked(0.72) : 1)));
  p.normals.fill(gablePts, along ? N_RIGHT : N_LEFT);
  if (o.gable) {
    const draw = o.gable;
    const ctx = p.ctx;
    ctx.save();
    p.fillPoly(gablePts, 'rgba(0,0,0,0)');
    ctx.clip();
    if (along) p.rightFace(v0, v1, u1, eave, (w) => draw(w, top - eave));
    else p.leftFace(u0, u1, v1, eave, (w) => draw(w, top - eave));
    ctx.restore();
  }
  p.strokePoly(gablePts, css(shade(wall, 0.4), 0.6), 1);
  const frontUp = quad(bm, top, bFrontBreak, zb);
  const frontLow = quad(bFrontBreak, zb, b1, eave);
  const rows = (q: Pt[]) => (t: number): [Pt, Pt] => [lerp(q[0]!, q[3]!, t), lerp(q[1]!, q[2]!, t)];
  p.roofSlope(frontUp, color, frontLight * 1.04, slope(1, half * (1 - k), upper), rows(frontUp));
  p.roofSlope(frontLow, color, frontLight * 0.96, slope(1, half * k, lower), rows(frontLow));
  p.recordRoof(u0 - ov, v0 - ov, u1 + ov, v1 + ov, eave, [pt(a0, bm, 0), pt(a1, bm, 0)], top);
  const ctx = p.ctx;
  ctx.lineCap = 'round';
  // Curb boards along the break, verge boards up the gable.
  if (o.trim !== undefined) {
    ctx.strokeStyle = css(shade(o.trim, frontLight));
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(...pt(a0, bFrontBreak, zb));
    ctx.lineTo(...pt(a1, bFrontBreak, zb));
    ctx.stroke();
    ctx.strokeStyle = css(shade(o.trim, along ? baked(0.8) : 1));
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    const verge: Pt[] = [pt(a1, b0, eave), pt(a1, bBackBreak, zb), pt(a1, bm, top), pt(a1, bFrontBreak, zb), pt(a1, b1, eave)];
    verge.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  }
  ctx.strokeStyle = css(shade(color, 0.55));
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(...pt(a0, bm, top));
  ctx.lineTo(...pt(a1, bm, top));
  ctx.stroke();
  return top;
}

/** Bell (ogee) profile: [height fraction, half-width fraction] from the flared foot to the top. */
const BELL: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [0.1, 0.8],
  [0.24, 0.66],
  [0.42, 0.58],
  [0.6, 0.5],
  [0.76, 0.38],
  [0.9, 0.24],
  [1, 0],
];

export interface BellRoofOpts {
  /** Half-width at the top as a fraction of the foot's (a seat for a lantern); 0 = a point. */
  readonly top?: number;
  /** Corner boards (hip rolls) in this colour. */
  readonly hips?: number;
}

/**
 * Square bell roof centred on (uc, vc), foot half-width r tiles at
 * `z`, `rise` art px high. Paints the far slopes first. Returns the
 * height of its top.
 */
export function bellRoof(p: IsoPainter, uc: number, vc: number, r: number, z: number, rise: number, color: number, o: BellRoofOpts = {}): number {
  const topK = o.top ?? 0;
  const prof = BELL.map(([zf, rf]) => [z + rise * zf, r * (topK + (1 - topK) * rf)] as const);
  // Sides: [du, dv] outward direction; back (-u, -v) first, then front (+v lit, +u shade).
  const sides: ReadonlyArray<readonly [number, number, number]> = [
    [0, -1, baked(0.84)],
    [-1, 0, baked(0.92)],
    [0, 1, baked(1.04)],
    [1, 0, baked(0.76)],
  ];
  const corner = (du: number, dv: number, s: number, h: number, rr: number): Pt => {
    // Corner s (-1 / +1) of the side facing (du, dv) at half-width rr.
    const u = du !== 0 ? uc + du * rr : uc + s * rr;
    const v = dv !== 0 ? vc + dv * rr : vc + s * rr;
    return p.p(u, v, h);
  };
  for (const [du, dv, light] of sides) {
    for (let i = 0; i + 1 < prof.length; i++) {
      const [za, ra] = prof[i]!;
      const [zb, rb] = prof[i + 1]!;
      const q: Pt[] = [corner(du, dv, -1, za, ra), corner(du, dv, 1, za, ra), corner(du, dv, 1, zb, rb), corner(du, dv, -1, zb, rb)];
      const normal = p.slope(du, dv, Math.max(0.005, ra - rb), zb - za);
      if (du + dv < 0) {
        p.fillPoly(q, css(shade(color, light)));
        p.normals.fill(q, normal);
      } else p.roofSlope(q, color, light, normal, (t) => [lerp(q[3]!, q[0]!, t), lerp(q[2]!, q[1]!, t)]);
    }
  }
  const ctx = p.ctx;
  if (o.hips !== undefined) {
    ctx.strokeStyle = css(o.hips, 0.9);
    ctx.lineWidth = 1.5;
    for (const [du, dv] of [[1, 1], [1, -1], [-1, 1]] as const) {
      ctx.beginPath();
      prof.forEach(([h, rr], i) => {
        const [x, y] = p.p(uc + du * rr, vc + dv * rr, h);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }
  for (const [du, dv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) p.addVolumePoint(uc + du * r, vc + dv * r, z);
  p.addVolumePoint(uc, vc, z + rise);
  return z + rise;
}
