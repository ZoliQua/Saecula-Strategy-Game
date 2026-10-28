import type { Ctx } from '../../canvas';
import { css, shade } from '../../palette';

/** Face-local cross-shaped arrow loop (the English castle slit) centred at x, bottom at y. */
export function crossLoop(ctx: Ctx, x: number, y: number, h: number, light: number): void {
  ctx.fillStyle = css(shade(0x16120e, light));
  ctx.fillRect(x - 1.2, y - h, 2.4, h);
  ctx.fillRect(x - 4, y - h * 0.62, 8, 2.2);
  ctx.fillStyle = 'rgba(255,250,235,.22)';
  ctx.fillRect(x - 2.4, y - h - 1, 1, h + 1);
}
