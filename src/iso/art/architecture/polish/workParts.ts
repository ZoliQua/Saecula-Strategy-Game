import { ellipse } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { post } from '../parts';

/*
 * Small yard props shared by the Polish workshops (M22): the smith's
 * anvil and quenching tub, a rack of bows, and a rack of round shields
 * painted in the owner's colour.
 */

/** Anvil on its log block with a quenching tub beside it, at (u, v). */
export function anvil(p: IsoPainter, u: number, v: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  ctx.fillStyle = '#5a3b20';
  ctx.fillRect(x - 5, y - 8, 10, 8);
  ctx.fillStyle = '#34343a';
  ctx.fillRect(x - 9, y - 12, 18, 4.5);
  ctx.fillRect(x - 3, y - 9, 6, 2);
  const [bx, by] = p.p(u + 0.12, v + 0.3, 0);
  ctx.fillStyle = '#6b4526';
  ctx.fillRect(bx - 6, by - 9, 12, 9);
  ellipse(ctx, bx, by - 9, 6, 3);
  ctx.fillStyle = css(0x24303a);
  ctx.fill();
}

/** Rack of strung bows on two posts along v from (u, v0) to (u, v1). */
export function bowRack(p: IsoPainter, u: number, v0: number, v1: number, wood: number): void {
  const ctx = p.ctx;
  post(p, u, v0, 0, 22, 2.2, wood);
  post(p, u, v1, 0, 22, 2.2, wood);
  const a = p.p(u, v0, 20);
  const b = p.p(u, v1, 20);
  ctx.strokeStyle = css(wood);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  for (let k = 1; k < 4; k++) {
    const x = a[0] + ((b[0] - a[0]) * k) / 4;
    const y = a[1] + ((b[1] - a[1]) * k) / 4;
    ctx.strokeStyle = '#4a2e18';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x + 3, y + 8, 8, Math.PI * 0.6, Math.PI * 1.4);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(235,225,200,.8)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x - 1.6, y + 0.6);
    ctx.lineTo(x - 1.6, y + 15.4);
    ctx.stroke();
  }
}

/** Rack of spears along u from (u0, v) to (u1, v), with round team-coloured shields leaning on it. */
export function shieldRack(p: IsoPainter, u0: number, u1: number, v: number, wood: number, team: number): void {
  const ctx = p.ctx;
  post(p, u0, v, 0, 18, 2.2, wood);
  post(p, u1, v, 0, 18, 2.2, wood);
  const a = p.p(u0, v, 16);
  const b = p.p(u1, v, 16);
  ctx.strokeStyle = css(wood);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  const n = 4;
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n;
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    // A spear leaning on the bar.
    ctx.strokeStyle = '#5e4128';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x - 2, y + 17);
    ctx.lineTo(x + 2, y - 12);
    ctx.stroke();
    ctx.fillStyle = '#b9bcc0';
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 12);
    ctx.lineTo(x + 3.4, y - 18);
    ctx.lineTo(x + 0.8, y - 12.5);
    ctx.closePath();
    ctx.fill();
    // A round shield before it.
    ellipse(ctx, x + 1, y + 9, 5, 6);
    ctx.fillStyle = css(shade(team, k % 2 ? 0.85 : 1));
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,26,14,.8)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ellipse(ctx, x + 1, y + 9, 1.4, 1.6);
    ctx.fillStyle = '#c9b68a';
    ctx.fill();
  }
}
