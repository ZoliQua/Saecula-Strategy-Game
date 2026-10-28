import type { Ctx } from '../../canvas';
import type { ChargePainter } from '../charges';

/**
 * Tricolour pales: green, white and red upright bands across the middle
 * of the shield, edged in gold, so the owner's colour still shows at
 * both flanks.
 */
function tricolore(ctx: Ctx, x: number, y: number, k: number): void {
  const w = k * 0.3;
  const top = y - k * 0.8;
  const h = k * 1.4;
  const bands = ['#2e8a43', '#f4f1e6', '#d0262f'] as const;
  ctx.fillStyle = '#d9b14a';
  ctx.fillRect(x - w * 1.5 - 0.8, top - 0.6, w * 3 + 1.6, h + 0.6);
  bands.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(x - w * 1.5 + i * w, top, w, h);
  });
}

/** The Italian charges (architecture/charges.ts spreads them). */
export const ITALIAN_CHARGES = { tricolore } satisfies Record<string, ChargePainter>;
