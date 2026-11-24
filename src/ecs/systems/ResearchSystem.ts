import { gameEvents } from '../../game/events';
import { CAVALRY_CLASS } from '../../config/balance';
import { researchSpeedMultiplier, scaleHealth } from '../../game/modifiers';
import type { PlayerManager } from '../../game/PlayerManager';
import { TECH_SPECS } from '../../game/technologies';
import type { UnitType } from '../../types';
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
      if ((building as Entity).underConstruction || (building as Entity).dying) continue;
      // The research landmark (M17) speeds up every research of its owner.
      const owner = this.players.get(building.owner.playerId);
      research.elapsed += dt * (owner ? researchSpeedMultiplier(owner) : 1);
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
    if (effect.kind === 'cavalryHp') this.scaleExistingHp(player.id, effect.bonus, (t) => CAVALRY_CLASS.includes(t));
    if (effect.kind === 'monkHp') this.scaleExistingHp(player.id, effect.bonus, (t) => t === 'monk');
    gameEvents.emit('techResearched', { playerId, techId });
  }

  /** Existing units of the matching types gain the HP bonus once (new ones get it at spawn). */
  private scaleExistingHp(playerId: number, bonus: number, applies: (type: UnitType) => boolean): void {
    for (const e of this.world.with('unit', 'health', 'owner')) {
      if (e.owner.playerId !== playerId) continue;
      if (applies(e.unit.unitType)) scaleHealth(e.health, 1 + bonus);
    }
  }
}
