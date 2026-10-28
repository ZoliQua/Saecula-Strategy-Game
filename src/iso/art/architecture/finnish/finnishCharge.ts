import type { Ctx } from '../../canvas';
import type { ChargePainter } from '../charges';

/**
 * Nordic cross: a blue cross edged in white, its upright set towards the
 * hoist, across the shield; the owner's colour shows in the four fields.
 */
function nordicCross(ctx: Ctx, x: number, y: number, k: number): void {
  const top = y - k;
  const h = k * 2.05;
  const left = x - k * 0.75;
  const w = k * 1.5;
  const ux = x - k * 0.22;
  const hy = y - k * 0.28;
  const bars = (t: number, colour: string) => {
    ctx.fillStyle = colour;
    ctx.fillRect(ux - t / 2, top, t, h);
    ctx.fillRect(left, hy - t / 2, w, t);
  };
  bars(k * 0.5, '#f4f1e6');
  bars(k * 0.28, '#1f4f9a');
}

/** The Finnish charges (architecture/charges.ts spreads them). */
export const FINNISH_CHARGES = { nordic_cross: nordicCross } satisfies Record<string, ChargePainter>;
