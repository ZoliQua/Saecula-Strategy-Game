import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import type { UV } from '../prism';

/*
 * Details of the Russian wall styles: the split clamp posts that hold
 * the horizontal logs of the age-1 wall, the stacked log ends where two
 * cribs of a gorodnya meet, and loopholes. The plank roof over the
 * fighting gallery is walls/kits/armRoof.ts (galleryRoof).
 */

/** Sawn end grain of a log. */
const END_GRAIN = 0xd8b88a;

/** Upright split post at ground point c from z0 to z1: a half-round, lit on its left, a blunt cut head. */
export function clampPost(p: IsoPainter, c: UV, z0: number, z1: number, color: number): void {
  const ctx = p.ctx;
  const [x, y0] = p.p(c[0], c[1], z0);
  const y1 = y0 - (z1 - z0);
  const r = 2.4;
  ctx.fillStyle = css(shade(color, 1.08));
  ctx.fillRect(x - r, y1, r, y0 - y1);
  ctx.fillStyle = css(shade(color, 0.66));
  ctx.fillRect(x, y1, r, y0 - y1);
  ctx.fillStyle = css(shade(END_GRAIN, 0.9));
  ctx.beginPath();
  ctx.ellipse(x, y1, r, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  p.normalCylinder(x - r, y1 - 1, r * 2, y0 - y1 + 1);
}

/** A column of sawn log ends at ground point c, one per log course from z0 to z1 (a crib's corner seen in the wall face). */
export function logEndColumn(p: IsoPainter, c: UV, z0: number, z1: number, color: number): void {
  const ctx = p.ctx;
  for (let z = z0 + 4; z < z1 - 2; z += 8) {
    const [x, y] = p.p(c[0], c[1], z);
    ctx.fillStyle = css(shade(color, 0.5), 0.8);
    ctx.beginPath();
    ctx.ellipse(x + 0.6, y + 0.4, 3.4, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(shade(END_GRAIN, 0.78));
    ctx.beginPath();
    ctx.ellipse(x, y, 2.9, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(shade(END_GRAIN, 0.72), 0.7);
    ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
  }
}

/** Dark loopholes along a face-local strip: `w` wide, sills at y, `h` tall, every `step` px. */
export function loopholes(ctx: Ctx, w: number, y: number, h: number, step: number, light: number): void {
  ctx.fillStyle = css(shade(0x1a120c, light));
  for (let x = step / 2; x < w - 3; x += step) ctx.fillRect(x - 1.4, y - h, 2.8, h);
}
