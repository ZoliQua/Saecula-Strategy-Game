import { ellipse } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { post } from '../parts';

/*
 * Polish-only yard prop (M22): a rack of spears with round shields
 * painted in the owner's colour (the anvil and bow rack are shared, in
 * kits/workshopProps.ts).
 */

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
