import type { EcsWorld } from '../ecs/world';
import type { PlayerManager } from './PlayerManager';

export type VictoryState =
  | { kind: 'playing' }
  | { kind: 'victory'; winnerId: number }
  | { kind: 'defeat'; winnerId: number };

/**
 * Conquest victory: a player is defeated once they own zero active
 * (non-dying) town centres. The human wins when every AI is defeated
 * and loses as soon as their own town centres are gone, whatever the
 * AIs are still doing to each other.
 */
export class VictoryChecker {
  constructor(
    private readonly world: EcsWorld,
    private readonly players: PlayerManager,
  ) {}

  check(): VictoryState {
    for (const player of this.players.all()) {
      if (player.defeated) continue;
      const hasTc = this.hasLiveTownCenter(player.id);
      if (!hasTc) this.players.markDefeated(player.id);
    }
    const human = this.players.human();
    if (!human) return { kind: 'playing' };
    if (human.defeated) {
      const winner = this.players.ais().find((p) => !p.defeated);
      return { kind: 'defeat', winnerId: winner?.id ?? 0 };
    }
    const ais = this.players.ais();
    if (ais.length > 0 && ais.every((p) => p.defeated)) {
      return { kind: 'victory', winnerId: human.id };
    }
    return { kind: 'playing' };
  }

  private hasLiveTownCenter(playerId: number): boolean {
    for (const entity of this.world.with('building', 'owner')) {
      if (entity.owner.playerId !== playerId) continue;
      if (entity.building.type !== 'town_center') continue;
      if (entity.dying) continue;
      return true;
    }
    return false;
  }
}
