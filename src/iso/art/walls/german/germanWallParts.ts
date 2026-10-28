import type { Ctx } from '../../canvas';
import { css, shade } from '../../palette';

/*
 * Face-local details of the German wall styles: the white-plastered
 * blind niches and friezes of North German brick Gothic, and dark loops.
 */

/** A pointed (lancet) opening or niche: bottom-left at (x, y), w wide, h tall. */
export function lancet(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h + w * 0.7);
  ctx.quadraticCurveTo(x, y - h + w * 0.15, x + w / 2, y - h);
  ctx.quadraticCurveTo(x + w, y - h + w * 0.15, x + w, y - h + w * 0.7);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();
}

/** Whitewashed blind niche with a shadowed reveal on its left. */
export function blindNiche(ctx: Ctx, x: number, y: number, w: number, h: number, plaster: number, light: number): void {
  lancet(ctx, x, y, w, h, css(shade(plaster, light * 0.95)));
  ctx.fillStyle = 'rgba(40,24,18,.35)';
  ctx.fillRect(x, y - h + w * 0.7, 1, h - w * 0.7);
}

/** A frieze of small blind niches under the parapet, along the whole face. */
export function nicheFrieze(ctx: Ctx, w: number, top: number, plaster: number, light: number): void {
  ctx.fillStyle = css(shade(plaster, light * 0.9), 0.85);
  ctx.fillRect(0, top + 7.5, w, 1.4);
  for (let x = 3; x < w - 4; x += 8) lancet(ctx, x, top + 7, 4.4, 6.5, css(shade(plaster, light * 0.92)));
}

/** A dark arrow slit, centred at x, bottom at y. */
export function slit(ctx: Ctx, x: number, y: number, h: number): void {
  ctx.fillStyle = '#1a110c';
  ctx.fillRect(x - 1.2, y - h, 2.4, h);
}
