import { ellipse } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css } from '../../palette';
import { post } from '../parts';

/*
 * Workshop yard props shared by several civs' own smithies and archery
 * ranges (M22): the smith's anvil with its quenching tub, and a rack of
 * strung bows. Civ-neutral: colours are fixed iron, oak and water, the
 * rack's wood comes from the caller's palette.
 */

/** Anvil on its block with a quenching tub beside it, at (u, v); the tub stands `tubDv` tiles along v. */
export function anvil(p: IsoPainter, u: number, v: number, tubDv = 0.36): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  ctx.fillStyle = '#5a3b20';
  ctx.fillRect(x - 5, y - 8, 10, 8);
  ctx.fillStyle = '#34343a';
  ctx.fillRect(x - 9, y - 12, 18, 4.5);
  ctx.fillRect(x - 3, y - 9, 6, 2);
  const [bx, by] = p.p(u + 0.12, v + tubDv, 0);
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
