import { gameEvents } from '../../game/events';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';

/**
 * Wonder victory clocks. A finished Wonder gets a `wonder` clock (and a
 * `wonderCompleted` event); the clock adds every tick's delta while the
 * Wonder stands. A Wonder that starts dying, or leaves the world, loses
 * its clock (`wonderLost`). Inactive when the match's victory mode does
 * not include the Wonder: nothing is added and nothing is emitted.
 * VictoryChecker reads the clocks; this system decides nothing itself.
 */
export class WonderSystem {
  /** Wonders with a running clock, to notice one removed without dying first. */
  private readonly tracked = new Set<Entity>();

  constructor(
    private readonly world: EcsWorld,
    private readonly enabled: boolean,
  ) {}

  update(deltaMs: number): void {
    if (!this.enabled) return;
    const wonders: Entity[] = [];
    for (const e of this.world.with('building', 'owner')) {
      if (e.building.type === 'wonder') wonders.push(e);
    }
    const seen = new Set<Entity>();
    for (const e of wonders) {
      if (e.dying) {
        if (e.wonder) this.lose(e);
        continue;
      }
      if (e.underConstruction) continue;
      seen.add(e);
      if (!e.wonder) {
        this.world.addComponent(e, 'wonder', { heldMs: 0 });
        gameEvents.emit('wonderCompleted', { playerId: e.owner?.playerId ?? 0, entityId: e.id ?? -1 });
      } else {
        // A clock already running (e.g. restored from a save) is tracked from here on.
        e.wonder.heldMs += deltaMs;
      }
      this.tracked.add(e);
    }
    for (const e of [...this.tracked]) {
      if (seen.has(e)) continue;
      if (this.world.has(e)) this.tracked.delete(e);
      else this.lose(e);
    }
  }

  private lose(e: Entity): void {
    this.tracked.delete(e);
    if (this.world.has(e) && e.wonder) this.world.removeComponent(e, 'wonder');
    gameEvents.emit('wonderLost', { playerId: e.owner?.playerId ?? 0, entityId: e.id ?? -1 });
  }
}
