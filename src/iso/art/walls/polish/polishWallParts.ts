import { drumWall } from '../../architecture/kits/drum';
import { needleSpire } from '../../architecture/kits/needleSpire';
import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { frontEdge, line } from '../kits/wallParts';
import { stations, type Arm } from '../wallKit';

/*
 * Details of the Polish wall styles: the crib grid of the Biskupin box
 * rampart (horizontal oak logs between upright crib corners, the cross
 * ties' log ends showing the earth-filled boxes), its breakwater of
 * oblique stakes at the foot, and the ring of small spired turrets that
 * crowns a Kraków barbican tower.
 */

/** Pale cut end of an oak log. */
const LOG_END = 0xd8b886;

/**
 * Face of a box rampart, face-local (x along the foot, y up as
 * negatives): courses of split oak, an upright crib corner every bay,
 * the cross ties' pale log ends on it, and dark earth showing in a gap
 * under every second course.
 */
export function cribFace(ctx: Ctx, w: number, h: number, light: number, oak: number, timber: number, earth: number): void {
  ctx.fillStyle = css(shade(earth, light * 0.7));
  ctx.fillRect(0, -h, w, h);
  for (let y = 0, i = 0; y < h - 1; y += 6, i++) {
    ctx.fillStyle = css(shade(oak, light * (i % 2 ? 0.92 : 1.08)));
    ctx.fillRect(0, -y - (i % 2 ? 4.2 : 5.2), w, i % 2 ? 4.2 : 5.2);
    ctx.fillStyle = 'rgba(24,16,10,.35)';
    ctx.fillRect(0, -y - 0.8, w, 0.8);
  }
  const bays = Math.max(2, Math.round(w / 15));
  for (let k = 0; k <= bays; k++) {
    const x = (w / bays) * k;
    ctx.fillStyle = css(shade(timber, light * 0.88));
    ctx.fillRect(x - 1.8, -h, 3.6, h);
    ctx.fillStyle = css(shade(LOG_END, light), 0.95);
    for (let y = 4; y < h - 2; y += 12) {
      ctx.beginPath();
      ctx.ellipse(x, -y - 1.6, 1.7, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Breakwater: oblique oak stakes driven at the arm's front foot, `off` tiles out, leaning outwards. */
export function breakwater(p: IsoPainter, arm: Arm, off: number, color: number): void {
  for (const c of stations(arm, 0.09, 0.02)) {
    const [u, v] = frontEdge(arm, c, off);
    const lean = frontEdge(arm, c, off + 0.1);
    const foot = p.p(u, v, 0);
    const tip = p.p(lean[0], lean[1], 11 + p.random() * 3);
    line(p, [foot[0], foot[1] + 1], tip, css(shade(color, 0.7)), 2.6);
    line(p, [foot[0] - 0.6, foot[1] + 1], [tip[0] - 0.6, tip[1]], css(shade(color, 1.12)), 0.9);
  }
}

/** Stake breastwork along the arm's front top edge at z, `half` tiles out. */
export function stakeBreastwork(p: IsoPainter, arm: Arm, half: number, z: number, height: number, color: number): void {
  const ctx = p.ctx;
  for (const c of stations(arm, 0.07, 0.01)) {
    const [u, v] = frontEdge(arm, c, half);
    const [x, y] = p.p(u, v, z);
    const h = height * (0.92 + p.random() * 0.14);
    ctx.fillStyle = css(shade(color, 0.8));
    ctx.beginPath();
    ctx.moveTo(x - 1.6, y + 0.5);
    ctx.lineTo(x - 1.6, y - h);
    ctx.lineTo(x, y - h - 2.6);
    ctx.lineTo(x + 1.6, y - h);
    ctx.lineTo(x + 1.6, y + 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = css(shade(color, 1.15), 0.8);
    ctx.fillRect(x - 1.6, y - h, 1, h);
  }
  const a = frontEdge(arm, arm.a, half);
  const b = frontEdge(arm, arm.b, half);
  line(p, p.p(a[0], a[1], z + height * 0.6), p.p(b[0], b[1], z + height * 0.6), 'rgba(36,24,14,.7)', 1.6);
  for (const q of [a, b]) p.addVolumePoint(q[0], q[1], z + height);
}

export interface TurretRing {
  /** Tower centre radius where the turrets stand (tiles). */
  readonly at: number;
  /** Turret drum radius (tiles). */
  readonly r: number;
  readonly count: number;
  readonly z0: number;
  readonly z1: number;
  readonly spire: number;
  readonly brick: number;
  readonly copper: number;
}

/** Turret angles of the ring, split into those behind and in front of the tower's axis (painted before / after its roof). */
function turretAngles(n: number): { back: number[]; front: number[] } {
  const all = Array.from({ length: n }, (_, k) => ((k + 0.5) / n) * Math.PI * 2);
  const depth = (a: number) => Math.cos(a) + Math.sin(a);
  const sorted = all.sort((a, b) => depth(a) - depth(b));
  return { back: sorted.filter((a) => depth(a) < 0), front: sorted.filter((a) => depth(a) >= 0) };
}

/** Small brick turrets with copper needle spires round a round tower's crown: the back half or the front half. */
export function turretRing(p: IsoPainter, ring: TurretRing, half: 'back' | 'front'): void {
  const angles = turretAngles(ring.count)[half];
  for (const a of angles) {
    const u = 0.5 + Math.cos(a) * ring.at;
    const v = 0.5 + Math.sin(a) * ring.at;
    drumWall(p, u, v, ring.r, ring.z0, ring.z1, ring.brick, 'brick');
    needleSpire(p, u, v, ring.r * 1.05, ring.z1, ring.spire, ring.copper, 'copper', 8);
  }
}
