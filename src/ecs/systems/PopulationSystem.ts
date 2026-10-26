import { houseBonus } from '../../game/modifiers';
import { computePopulation } from '../../game/population';
import type { PlayerManager } from '../../game/PlayerManager';
import { uiStore } from '../../ui/store';
import type { EcsWorld } from '../world';

/**
 * Recomputes the human player's population count and cap every tick
 * and mirrors it into the UI store (AIs compute theirs on demand).
 */
export class PopulationSystem {
  constructor(
    private readonly world: EcsWorld,
    private readonly playerId: number,
    private readonly players: PlayerManager | null = null,
  ) {}

  update(): void {
    const player = this.players?.get(this.playerId);
    const perHouse = player ? houseBonus(player) : 0;
    const { current, cap } = computePopulation(this.world.with('owner'), this.playerId, perHouse);
    const state = uiStore.getState();
    if (state.population.current !== current || state.population.cap !== cap) {
      state.setPopulation({ current, cap });
    }
  }
}
