import type { Ctx } from '../../canvas';
import type { ChargePainter } from '../charges';

/** One fleur-de-lis path: tall centre petal, two outcurving side petals, the tied foot. */
function lily(ctx: Ctx, x: number, y: number, k: number): void {
  ctx.beginPath();
  // Centre petal.
  ctx.moveTo(x, y - k * 0.95);
  ctx.bezierCurveTo(x + k * 0.3, y - k * 0.6, x + k * 0.26, y - k * 0.25, x + k * 0.1, y - k * 0.02);
  ctx.lineTo(x - k * 0.1, y - k * 0.02);
  ctx.bezierCurveTo(x - k * 0.26, y - k * 0.25, x - k * 0.3, y - k * 0.6, x, y - k * 0.95);
  ctx.closePath();
  // Side petals, curling out and down.
  for (const d of [-1, 1]) {
    ctx.moveTo(x + d * k * 0.1, y - k * 0.05);
    ctx.bezierCurveTo(x + d * k * 0.2, y - k * 0.55, x + d * k * 0.85, y - k * 0.55, x + d * k * 0.72, y - k * 0.12);
    ctx.bezierCurveTo(x + d * k * 0.66, y + k * 0.05, x + d * k * 0.52, y + k * 0.02, x + d * k * 0.5, y - k * 0.12);
    ctx.bezierCurveTo(x + d * k * 0.52, y - k * 0.3, x + d * k * 0.3, y - k * 0.28, x + d * k * 0.18, y + k * 0.02);
    ctx.closePath();
  }
  // Band and foot.
  ctx.rect(x - k * 0.36, y, k * 0.72, k * 0.15);
  ctx.moveTo(x - k * 0.12, y + k * 0.15);
  ctx.lineTo(x + k * 0.12, y + k * 0.15);
  ctx.lineTo(x + k * 0.05, y + k * 0.42);
  ctx.lineTo(x, y + k * 0.62);
  ctx.lineTo(x - k * 0.05, y + k * 0.42);
  ctx.closePath();
  for (const d of [-1, 1]) {
    ctx.moveTo(x + d * k * 0.1, y + k * 0.15);
    ctx.quadraticCurveTo(x + d * k * 0.36, y + k * 0.2, x + d * k * 0.34, y + k * 0.46);
    ctx.quadraticCurveTo(x + d * k * 0.2, y + k * 0.3, x + d * k * 0.06, y + k * 0.3);
    ctx.closePath();
  }
}

/**
 * French crest charge (charges.ts): a gold fleur-de-lis, edged dark so
 * it reads on pale and on gold-adjacent team fields.
 */
export const FRENCH_CHARGES = {
  fleur_de_lis: (ctx, x, y, s) => {
    const k = s * 0.95;
    lily(ctx, x, y + k * 0.12, k);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(0.7, s * 0.12);
    ctx.strokeStyle = 'rgba(40,30,12,.85)';
    ctx.stroke();
    ctx.fillStyle = '#ecc84e';
    ctx.fill();
  },
} satisfies Record<string, ChargePainter>;
