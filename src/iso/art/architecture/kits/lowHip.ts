import { lerp } from '../../isoProps';
import type { IsoPainter } from '../../isoPainter';
import { baked } from '../../lighting/normalLayer';
import { css, shade } from '../../palette';
import type { ArchStyle } from '../style';

type Pt = readonly [number, number];

/*
 * Low hipped roof kit (Mediterranean civs): a shallow tiled hip whose
 * ridge runs along the block's longer side (a pyramid on square blocks),
 * the rise scaled by the style's pitch and covered in the style's roof
 * material, with ridge and hip tiles picked out.
 */

/** Footprint of a block in tiles. */
export type Block = readonly [u0: number, v0: number, u1: number, v1: number];

/**
 * Low hipped tile roof with a ridge along the block's longer side (a
 * pyramid on square blocks), rise scaled by the style's pitch.
 */
export function lowHip(p: IsoPainter, s: ArchStyle, [u0, v0, u1, v1]: Block, eave: number, rise: number, color = s.palette.roof, o = 0.09): Pt {
  const r = rise * s.roof.pitch;
  const prev = p.material;
  p.material = s.roof.material ?? 'tile';
  const top = eave + r;
  const A = p.p(u0 - o, v0 - o, eave);
  const B = p.p(u1 + o, v0 - o, eave);
  const C = p.p(u1 + o, v1 + o, eave);
  const D = p.p(u0 - o, v1 + o, eave);
  const alongU = u1 - u0 >= v1 - v0;
  const run = (alongU ? v1 - v0 : u1 - u0) / 2 + o;
  const um = (u0 + u1) / 2;
  const vm = (v0 + v1) / 2;
  const r0 = alongU ? [Math.min(um, u0 - o + run), vm] as const : [um, Math.min(vm, v0 - o + run)] as const;
  const r1 = alongU ? [Math.max(um, u1 + o - run), vm] as const : [um, Math.max(vm, v1 + o - run)] as const;
  const R0 = p.p(r0[0], r0[1], top);
  const R1 = p.p(r1[0], r1[1], top);
  const back: Pt[] = alongU ? [A, B, R1, R0] : [A, B, R0];
  const leftEnd: Pt[] = alongU ? [D, A, R0] : [D, A, R0, R1];
  p.fillPoly(back, css(shade(color, baked(0.82))));
  p.normals.fill(back, p.slope(0, -1, run, r));
  p.fillPoly(leftEnd, css(shade(color, baked(0.92))));
  p.normals.fill(leftEnd, p.slope(-1, 0, run, r));
  const front: Pt[] = alongU ? [D, C, R1, R0] : [D, C, R1];
  const rightEnd: Pt[] = alongU ? [C, B, R1] : [C, B, R0, R1];
  p.roofSlope(front, color, baked(1.05), p.slope(0, 1, run, r), (t) => [lerp(D, alongU ? R0 : R1, 1 - t), lerp(C, R1, 1 - t)]);
  p.roofSlope(rightEnd, color, baked(0.76), p.slope(1, 0, run, r), (t) => [lerp(C, R1, 1 - t), lerp(B, alongU ? R1 : R0, 1 - t)]);
  p.recordRoof(u0 - o, v0 - o, u1 + o, v1 + o, eave, [p.p(r0[0], r0[1], 0), p.p(r1[0], r1[1], 0)], top);
  // Ridge and hip tiles.
  const ctx = p.ctx;
  ctx.strokeStyle = css(shade(color, 1.25));
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(R0[0], R0[1]);
  ctx.lineTo(R1[0], R1[1]);
  ctx.moveTo(C[0], C[1]);
  ctx.lineTo(R1[0], R1[1]);
  ctx.moveTo(D[0], D[1]);
  ctx.lineTo((alongU ? R0 : R1)[0], (alongU ? R0 : R1)[1]);
  ctx.stroke();
  p.material = prev;
  return R1;
}
