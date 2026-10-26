import { gameEvents } from '../../game/events';
import type { PlayerManager } from '../../game/PlayerManager';
import { TECH_SPECS } from '../../game/technologies';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';

/**
 * Advances the research on every building and applies the technology
 * effect on completion (age-ups set `player.age`).
 */
export class ResearchSystem {
  constructor(
    private readonly world: EcsWorld,
    private readonly players: PlayerManager,
  ) {}

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    // Research in a destroyed building is lost without refund (AoE convention).
    for (const building of [...this.world.with('research', 'owner')]) {
      const research = building.research;
      if ((building as Entity).underConstruction) continue;
      research.elapsed += dt;
      if (research.elapsed < research.totalTime) continue;
      const { techId } = research;
      this.world.removeComponent(building, 'research');
      this.complete(building.owner.playerId, techId);
    }
  }

  private complete(playerId: number, techId: keyof typeof TECH_SPECS): void {
    const player = this.players.get(playerId);
    if (!player || player.researched.has(techId)) return;
    player.researched.add(techId);
    const effect = TECH_SPECS[techId].effect;
    if (effect.kind === 'age') {
      player.age = effect.age;
      gameEvents.emit('ageChanged', { playerId, age: effect.age });
    }
    gameEvents.emit('techResearched', { playerId, techId });
  }
}
