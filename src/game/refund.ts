import { DELETE_REFUND } from '../config/balance';
import type { Resources } from '../types';

/** A site's build progress, `elapsed / totalTime` clamped to [0, 1]. */
export function siteProgress(uc: { readonly elapsed: number; readonly totalTime: number }): number {
  if (uc.totalTime <= 0) return 1;
  return Math.max(0, Math.min(1, uc.elapsed / uc.totalTime));
}

/**
 * Refund percentage for deleting a building: `round((1 - p) * 80)` for
 * a site up to half built, 0 past that or for a finished building
 * (`progress` null).
 */
export function refundPercent(progress: number | null): number {
  if (progress === null) return 0;
  const p = Math.max(0, Math.min(1, progress));
  if (p > DELETE_REFUND.untilProgress) return 0;
  return Math.round((1 - p) * DELETE_REFUND.maxPercent);
}

/** What deleting a building returns: each resource of `cost` at refundPercent, rounded. */
export function refundFor(cost: Resources, progress: number | null): Resources {
  const pct = refundPercent(progress);
  return {
    food: Math.round((cost.food * pct) / 100),
    wood: Math.round((cost.wood * pct) / 100),
    gold: Math.round((cost.gold * pct) / 100),
  };
}
