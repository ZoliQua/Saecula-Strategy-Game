import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { prism, type UV } from '../prism';
import { stations, type Arm } from '../wallKit';
import { armShadow, line, plank } from './wallParts';

/*
 * Bank-palisade kit (English Romano-British, German Limes): split-oak
 * planks with binding rails on the crest of a turfed earth bank. Each
 * civ gives its own earth, turf and timber and its own watch-post.
 */

export interface BankPalisadeMaterials {
  readonly bank: number;
  readonly turf: number;
  readonly timber: number;
}

/**
 * Posts that recede above their footprint (mounds, battered plinths,
 * sloping scarps) have arms reach to the post's body: behind arms start
 * at the centre (the post, painted after them, covers the overlap) and
 * front arms at the body's face (its corner on diagonals).
 */
export function reachBody(body: number): (diagonal: boolean, behind: boolean) => number {
  return (diagonal, behind) => (behind ? 0 : body * (diagonal ? Math.SQRT2 : 1));
}

/** Offset of a station across an arm's line (tiles, + = the arm's left). */
export function across(arm: Arm, c: UV, off: number): UV {
  const len = Math.hypot(arm.b[0] - arm.a[0], arm.b[1] - arm.a[1]) || 1;
  return [c[0] - ((arm.b[1] - arm.a[1]) / len) * off, c[1] + ((arm.b[0] - arm.a[0]) / len) * off];
}

/** Grass lip over the top of an earth face, darker earth at the foot. */
export function turfFace(ctx: Ctx, w: number, h: number, light: number, turf: number): void {
  ctx.fillStyle = css(shade(turf, light * 0.95));
  ctx.beginPath();
  ctx.moveTo(0, -h);
  for (let x = 0; x <= w; x += 6) ctx.lineTo(x, -h + 3 + ((x * 7) % 5));
  ctx.lineTo(w, -h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(30,22,12,.22)';
  ctx.fillRect(0, -3, w, 3);
}

/** Soft contact shadow under a bank-palisade arm. */
export function bankPalisadeShadow(p: IsoPainter, arm: Arm): void {
  armShadow(p, arm, 0.3 * arm.girth);
}

/** One arm: the turfed bank, then the planks between a rear and a front rail. */
export function bankPalisadeArm(p: IsoPainter, arm: Arm, m: BankPalisadeMaterials): void {
  prism(p, arm.a, arm.b, 0.31 * arm.girth, 0, 13, { color: m.bank, top: m.turf, batter: 0.14, face: (w, h, l) => turfFace(p.ctx, w, h, l, m.turf) });
  // Planks on the crest: a staggered double row on 45° runs so they still read end-on.
  const rows = arm.diagonal ? [-0.065, 0.065] : [0];
  const pts = rows
    .flatMap((off) => stations(arm, 0.075, 0.015).map((c) => across(arm, c, off)))
    .sort((x, y) => x[0] + x[1] - (y[0] + y[1]));
  const rail = (z: number) => line(p, p.p(arm.a[0], arm.a[1], z), p.p(arm.b[0], arm.b[1], z), 'rgba(40,28,16,.75)', 2.4);
  rail(32);
  for (const c of pts) plank(p, c, 12, 37, m.timber);
  rail(20);
  for (const q of [arm.a, arm.b]) p.addVolumePoint(q[0], q[1], 52);
}
