import type { IsoPainter } from '../../isoPainter';
import { lerp } from '../../isoProps';
import { baked } from '../../lighting/normalLayer';
import { N_LEFT, N_RIGHT } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';

type Pt = readonly [number, number];
type GableDetail = (width: number, rise: number) => void;

/*
 * Half-hip (Krüppelwalm) roof kit: a gable roof whose gable ends are
 * cut off near the ridge by a small hip, the South German and Alemannic
 * farmhouse roof. The gable walls rise only to HIP_AT of the roof's
 * rise; above them a hipped slope runs back to a shortened ridge. Styles
 * pick it with roof.form 'halfHip' (styledRoofs.ts styledGable).
 */

/** Fraction of the rise at which the gable wall stops and the hip begins. */
export const HIP_AT = 0.62;

/**
 * Half-hip roof over u0..u1 × v0..v1 (ridge along `axis`), eave
 * overhang `o`; `detail` dresses the visible gable wall (clipped to its
 * own triangle by the caller's painter, the hip covers the tip).
 */
export function halfHipRoof(
  p: IsoPainter,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  eave: number,
  rise: number,
  color: number,
  wall: number,
  axis: 'u' | 'v',
  o: number,
  detail?: GableDetail,
): void {
  const top = eave + rise;
  const zk = eave + rise * HIP_AT;
  // Work in (a, b): a along the ridge, b across it; map back to (u, v).
  const [a0, a1, b0, b1] = axis === 'u' ? [u0, u1, v0, v1] : [v0, v1, u0, u1];
  const at = (a: number, b: number, z: number): Pt => (axis === 'u' ? p.p(a, b, z) : p.p(b, a, z));
  const bm = (b0 + b1) / 2;
  const half = (b1 - b0) / 2 + o;
  const inset = (half * (1 - HIP_AT)) * 0.9;
  const bF = b1 + o - HIP_AT * half;
  const bB = b0 - o + HIP_AT * half;
  const run = half;
  // Back slope (falls towards -b), full length at the eave, shortened at the ridge.
  const back: Pt[] = [at(a0 - o, b0 - o, eave), at(a1 + o, b0 - o, eave), at(a1 + o, bB, zk), at(a1 - inset, bm, top), at(a0 + inset, bm, top), at(a0 - o, bB, zk)];
  p.fillPoly(back, css(shade(color, baked(axis === 'u' ? 0.8 : 0.85))));
  p.normals.fill(back, axis === 'u' ? p.slope(0, -1, run, rise) : p.slope(-1, 0, run, rise));
  // Visible gable wall at a1, up to the hip line.
  const gable: Pt[] = [at(a1, b0, eave), at(a1, b1, eave), at(a1, b1 - HIP_AT * (b1 - bm), zk), at(a1, b0 + HIP_AT * (bm - b0), zk)];
  const lit = axis === 'u' ? baked(0.72) : 1;
  p.fillPoly(gable, css(shade(wall, lit)));
  p.normals.fill(gable, axis === 'u' ? N_RIGHT : N_LEFT);
  if (detail) {
    if (axis === 'u') p.rightFace(v0, v1, u1, eave, (w) => detail(w, rise));
    else p.leftFace(u0, u1, v1, eave, (w) => detail(w, rise));
  }
  p.strokePoly(gable, css(shade(wall, 0.4), 0.6), 1);
  // The hip at a1: a small slope from the cut gable back to the ridge end.
  const hipFace: Pt[] = [at(a1 + o, bB, zk), at(a1 + o, bF, zk), at(a1 - inset, bm, top)];
  const hipNormal = axis === 'u' ? p.slope(1, 0, inset + o, rise * (1 - HIP_AT)) : p.slope(0, 1, inset + o, rise * (1 - HIP_AT));
  p.roofSlope(hipFace, color, baked(axis === 'u' ? 0.75 : 1.05), hipNormal, (t) => [lerp(hipFace[2]!, hipFace[0]!, t), lerp(hipFace[2]!, hipFace[1]!, t)]);
  // Front slope (falls towards +b).
  const front: Pt[] = [at(a0 + inset, bm, top), at(a1 - inset, bm, top), at(a1 + o, bF, zk), at(a1 + o, b1 + o, eave), at(a0 - o, b1 + o, eave), at(a0 - o, bF, zk)];
  const frontNormal = axis === 'u' ? p.slope(0, 1, run, rise) : p.slope(1, 0, run, rise);
  p.roofSlope(front, color, baked(axis === 'u' ? 1.05 : 0.78), frontNormal, (t) => [
    t < HIP_AT ? lerp(at(a0 + inset, bm, top), at(a0 - o, bF, zk), t / HIP_AT) : lerp(at(a0 - o, bF, zk), at(a0 - o, b1 + o, eave), (t - HIP_AT) / (1 - HIP_AT)),
    t < HIP_AT ? lerp(at(a1 - inset, bm, top), at(a1 + o, bF, zk), t / HIP_AT) : lerp(at(a1 + o, bF, zk), at(a1 + o, b1 + o, eave), (t - HIP_AT) / (1 - HIP_AT)),
  ]);
  const ridge = [at(a0 + inset, bm, 0), at(a1 - inset, bm, 0)];
  p.recordRoof(u0 - o, v0 - o, u1 + o, v1 + o, eave, ridge, top);
  p.ctx.strokeStyle = css(shade(color, 1.35), 0.8);
  p.ctx.lineWidth = 1.4;
  p.ctx.beginPath();
  const r0 = at(a0 + inset, bm, top);
  const r1 = at(a1 - inset, bm, top);
  p.ctx.moveTo(r0[0], r0[1]);
  p.ctx.lineTo(r1[0], r1[1]);
  p.ctx.stroke();
}
