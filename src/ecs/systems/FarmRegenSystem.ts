import { FARM_BALANCE } from '../../config/balance';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';

/**
 * Regrows the food of every standing farm by FARM_BALANCE.regenPerSec,
 * up to its capacity (PROGRAM_TERV.md §8.2–8.3: farms regenerate
 * automatically), so a farm is never used up for good.
 */
export class FarmRegenSystem {
  constructor(private readonly world: EcsWorld) {}

  update(deltaMs: number): void {
    const grow = (FARM_BALANCE.regenPerSec * deltaMs) / 1000;
    for (const farm of this.world.with('building', 'resourceNode')) {
      if (farm.building.type !== 'farm' || (farm as Entity).dying) continue;
      const node = farm.resourceNode;
      if (node.amount < node.maxAmount) node.amount = Math.min(node.maxAmount, node.amount + grow);
    }
  }
}
