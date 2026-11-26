import type { Ctx } from '../../canvas';
import type { ChargePainter } from '../charges';

/**
 * White eagle (Orzeł Biały): a white eagle displayed, head turned to the
 * hoist, wings raised with feathered tips, a gold crown and gold talons,
 * on the shield's field (the owner's colour stands in for the red).
 */
function whiteEagle(ctx: Ctx, x: number, y: number, k: number): void {
  const white = '#f6f3ea';
  const gold = '#e2b23c';
  ctx.fillStyle = white;
  // Wings: raised fans with three feather tips each.
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * k * 0.12, y - k * 0.32);
    ctx.lineTo(x + side * k * 0.66, y - k * 0.78);
    ctx.lineTo(x + side * k * 0.62, y - k * 0.5);
    ctx.lineTo(x + side * k * 0.72, y - k * 0.46);
    ctx.lineTo(x + side * k * 0.6, y - k * 0.24);
    ctx.lineTo(x + side * k * 0.68, y - k * 0.16);
    ctx.lineTo(x + side * k * 0.14, y + k * 0.06);
    ctx.closePath();
    ctx.fill();
  }
  // Body and spread tail.
  ctx.beginPath();
  ctx.ellipse(x, y - k * 0.1, k * 0.17, k * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - k * 0.12, y + k * 0.18);
  ctx.lineTo(x - k * 0.26, y + k * 0.56);
  ctx.lineTo(x + k * 0.26, y + k * 0.56);
  ctx.lineTo(x + k * 0.12, y + k * 0.18);
  ctx.closePath();
  ctx.fill();
  // Head turned to the hoist.
  ctx.beginPath();
  ctx.arc(x - k * 0.06, y - k * 0.52, k * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = gold;
  // Beak, crown and talons.
  ctx.fillRect(x - k * 0.26, y - k * 0.54, k * 0.1, k * 0.06);
  ctx.beginPath();
  ctx.moveTo(x - k * 0.2, y - k * 0.64);
  ctx.lineTo(x - k * 0.2, y - k * 0.8);
  ctx.lineTo(x - k * 0.12, y - k * 0.7);
  ctx.lineTo(x - k * 0.06, y - k * 0.84);
  ctx.lineTo(x, y - k * 0.7);
  ctx.lineTo(x + k * 0.08, y - k * 0.8);
  ctx.lineTo(x + k * 0.08, y - k * 0.64);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - k * 0.24, y + k * 0.14, k * 0.12, k * 0.08);
  ctx.fillRect(x + k * 0.12, y + k * 0.14, k * 0.12, k * 0.08);
}

/** The Polish charges (architecture/charges.ts spreads them). */
export const POLISH_CHARGES = { white_eagle: whiteEagle } satisfies Record<string, ChargePainter>;
