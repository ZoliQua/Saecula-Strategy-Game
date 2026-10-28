import type { Ctx } from '../../canvas';
import { css, shade } from '../../palette';

/*
 * Details of the Italian wall styles: the big regular tufa blocks of
 * the Servian wall laid in opus quadratum (courses of stretchers and
 * headers, fine joints, no rubble, no timber), and the pointed
 * Sienese slit. The forked merlon is in walls/kits/forkedMerlon.ts.
 */

/**
 * Opus quadratum: courses of big dressed blocks, stretchers (long side
 * out) and headers (end out) alternating course by course, each block
 * a touch different in tone, a lit arris on top and a fine dark joint.
 */
export function ashlarFace(ctx: Ctx, w: number, h: number, light: number, stone: number, rand: () => number, course = 9): void {
  ctx.fillStyle = css(shade(stone, light * 0.62));
  ctx.fillRect(0, -h, w, h);
  for (let y = 0, row = 0; y < h - 0.5; y += course, row++) {
    const ch = Math.min(course, h - y);
    const len = row % 2 ? 11 : 24;
    for (let x = (row % 4) * -6; x < w; x += len) {
      ctx.fillStyle = css(shade(stone, light * (0.93 + rand() * 0.12)));
      ctx.fillRect(x + 0.7, -y - ch + 0.7, len - 1.4, ch - 1.4);
      ctx.fillStyle = css(shade(stone, light * 1.18), 0.55);
      ctx.fillRect(x + 0.7, -y - ch + 0.7, len - 1.4, 1);
    }
  }
}

/** Pointed (Sienese) slit in a travertine frame, centred at x, its sill at y (face-local). */
export function pointedSlit(ctx: Ctx, x: number, y: number, h: number, frame: number, light: number): void {
  ctx.fillStyle = css(shade(frame, light));
  ctx.beginPath();
  ctx.moveTo(x - 3.5, y);
  ctx.lineTo(x - 3.5, y - h + 3);
  ctx.lineTo(x, y - h - 2.5);
  ctx.lineTo(x + 3.5, y - h + 3);
  ctx.lineTo(x + 3.5, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1d140e';
  ctx.fillRect(x - 1, y - h + 2, 2, h - 3);
}
