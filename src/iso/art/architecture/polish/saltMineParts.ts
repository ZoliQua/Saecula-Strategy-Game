import type { Ctx } from '../../canvas';
import { HW, type IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { beam } from '../landmarkProps';
import { helm } from '../roofs';

/*
 * Props of the Wieliczka salt mine (Polish landmark): the horse whim
 * (kierat) with its drum, sweep and horse, salt barrels and the grey
 * salt blocks (bałwany) hauled up the shaft.
 */

/** Grey-green rock salt. */
export const SALT = 0xb9bcae;
const HORSE = 0x6a4a30;

/** A small draught horse walking the whim's circle, facing +u (screen right-down), hooves at (x, y). */
export function whimHorse(ctx: Ctx, x: number, y: number): void {
  const body = css(HORSE);
  const dark = css(shade(HORSE, 0.6));
  ctx.fillStyle = dark;
  for (const dx of [-6, -3.5, 4, 6.5]) ctx.fillRect(x + dx, y - 8, 1.6, 8);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(x, y - 11, 9, 4.6, 0.18, 0, Math.PI * 2);
  ctx.fill();
  // Neck and head.
  ctx.beginPath();
  ctx.moveTo(x + 5, y - 13);
  ctx.lineTo(x + 10, y - 20);
  ctx.lineTo(x + 14, y - 18);
  ctx.lineTo(x + 13, y - 15);
  ctx.lineTo(x + 8, y - 9);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.fillRect(x + 8, y - 21, 3, 4);
  // Tail.
  ctx.fillRect(x - 10, y - 13, 2, 7);
  // Collar.
  ctx.fillStyle = '#8a6a3a';
  ctx.fillRect(x + 6, y - 16, 2.6, 6);
}

/** A salt barrel standing at (u, v), `h` art px tall. */
export function barrel(p: IsoPainter, u: number, v: number, h: number, wood: number): void {
  helm(p, u, v, 0, [[0, 0.07], [h * 0.5, 0.085], [h, 0.07]], wood, false);
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  ctx.strokeStyle = 'rgba(40,30,22,.85)';
  ctx.lineWidth = 1.1;
  for (const k of [0.2, 0.8]) {
    ctx.beginPath();
    ctx.ellipse(x, y - h * k, 0.08 * Math.SQRT2 * HW, 0.08 * HW * 0.7, 0, 0, Math.PI);
    ctx.stroke();
  }
  ctx.fillStyle = css(shade(SALT, 1.15));
  ctx.beginPath();
  ctx.ellipse(x, y - h, 0.07 * Math.SQRT2 * HW * 0.85, 0.07 * HW * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** A salt block (bałwan): a rough grey-green cylinder lying on its side along u at (u, v). */
export function saltBlock(p: IsoPainter, u: number, v: number, len: number): void {
  beam(p, [u, v, 7], [u + len, v, 7], SALT, 13);
}

/**
 * Horse whim at (uc, vc): a conical shingled roof on posts over the
 * vertical rope drum, the sweep arm reaching out beyond the roof and
 * the horse walking its circle.
 */
export function horseWhim(p: IsoPainter, uc: number, vc: number, r: number, timber: number, roof: number, eave: number): void {
  // Trodden circle.
  const ctx = p.ctx;
  const [gx, gy] = p.p(uc, vc, 0);
  const rx = r * 1.25 * Math.SQRT2 * HW;
  ctx.fillStyle = 'rgba(120,96,64,.55)';
  ctx.beginPath();
  ctx.ellipse(gx, gy, rx, rx * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Back posts, the drum, the sweep and the horse, then the front posts and the cone.
  const post = (a: number) => {
    const u = uc + Math.cos(a) * r;
    const v = vc + Math.sin(a) * r;
    beam(p, [u, v, 0], [u, v, eave], timber, 3);
  };
  for (const a of [Math.PI * 1.25, Math.PI * 1.75, Math.PI * 0.75]) post(a);
  helm(p, uc, vc, 0, [[0, 0.16], [8, 0.16], [10, 0.13], [34, 0.13], [36, 0.16], [40, 0.16]], timber, true);
  beam(p, [uc, vc, 30], [uc + r * 1.3, vc + r * 0.35, 18], timber, 3);
  const [hx, hy] = p.p(uc + r * 1.25, vc + r * 0.5, 0);
  whimHorse(ctx, hx, hy);
  post(Math.PI * 0.25);
  helm(p, uc, vc, eave, [[0, r * 1.15], [4, r * 1.0], [34, 0.04], [40, 0.0]], roof, true);
}
