import { BUILDING_BALANCE } from '../../config/balance';
import { houseBonus } from '../../game/modifiers';
import type { PlayerManager } from '../../game/PlayerManager';
import { uiStore } from '../../ui/store';
import type { EcsWorld } from '../world';

const MAX_CAP = 200;

/**
 * Recomputes the player's population count (sum of populationCost on
 * all owned units) and cap (building pop bonuses + the house technology). Runs every tick;
 * it's cheap because the queries iterate only owned entities.
 */
export class PopulationSystem {
  private readonly world: EcsWorld;
  private readonly playerId: number;

  constructor(
    world: EcsWorld,
    playerId: number,
    private readonly players: PlayerManager | null = null,
  ) {
    this.world = world;
    this.playerId = playerId;
  }

  update(): void {
    let current = 0;
    for (const entity of this.world.with('populationCost', 'owner')) {
      if (entity.owner.playerId !== this.playerId) continue;
      current += entity.populationCost.amount;
    }
    let cap = 0;
    const player = this.players?.get(this.playerId);
    const perHouse = player ? houseBonus(player) : 0;
    for (const b of this.world.with('building', 'owner')) {
      if (b.owner.playerId !== this.playerId) continue;
      if ((b as { underConstruction?: unknown }).underConstruction) continue;
      cap += BUILDING_BALANCE[b.building.type].popBonus;
      if (b.building.type === 'house') cap += perHouse;
    }
    cap = Math.min(cap, MAX_CAP);

    const state = uiStore.getState();
    if (
      state.population.current !== current ||
      state.population.cap !== cap
    ) {
      state.setPopulation({ current, cap });
    }
  }
}
