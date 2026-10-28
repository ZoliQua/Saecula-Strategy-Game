import type { Ctx } from '../../canvas';
import type { ChargePainter } from '../charges';

/**
 * St Andrew's saltire: a blue diagonal cross edged in white across the
 * shield, so the owner's colour still shows in the four quarters.
 */
function saltire(ctx: Ctx, x: number, y: number, k: number): void {
  const top = y - k * 0.8;
  const bottom = y + k * 0.6;
  const half = k * 0.62;
  const bar = (w: number, colour: string) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(x - half, top);
    ctx.lineTo(x + half, bottom);
    ctx.moveTo(x + half, top);
    ctx.lineTo(x - half, bottom);
    ctx.stroke();
  };
  bar(k * 0.42, '#f4f1e6');
  bar(k * 0.24, '#1f4fa0');
}

/** The Russian charges (architecture/charges.ts spreads them). */
export const RUSSIAN_CHARGES = { saltire } satisfies Record<string, ChargePainter>;
