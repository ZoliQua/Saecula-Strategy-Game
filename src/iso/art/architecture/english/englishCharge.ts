import type { ChargePainter } from '../charges';

/** English crest charge (charges.ts): St George's cross, white so it reads on every team field. */
export const ENGLISH_CHARGES = {
  st_george: (ctx, x, y, s) => {
    ctx.fillStyle = 'rgba(250,244,230,.92)';
    ctx.fillRect(x - s * 0.13, y - s * 0.95, s * 0.26, s * 1.95);
    ctx.fillRect(x - s * 0.75, y - s * 0.38, s * 1.5, s * 0.26);
  },
} satisfies Record<string, ChargePainter>;
