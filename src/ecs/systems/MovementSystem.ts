import { bonusesFor } from '../../game/modifiers';
import type { PlayerManager } from '../../game/PlayerManager';
import { directionFromDelta } from '../../types';
import type { EcsWorld } from '../world';

/**
 * Advances entities along their `movable.path` at `movable.speed`
 * tiles per second. When an entity reaches the next tile, its
 * `position` snaps to that tile and `progress` resets for the next
 * step. Empty path → no-op.
 */
export class MovementSystem {
  private readonly world: EcsWorld;

  constructor(
    world: EcsWorld,
    private readonly players: PlayerManager | null = null,
  ) {
    this.world = world;
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    const movers = this.world.with('position', 'movable');
    for (const entity of movers) {
      const mv = entity.movable;
      if (mv.path.length === 0) continue;

      mv.progress += mv.speed * bonusesFor(this.players, entity).speedMultiplier * dt;
      while (mv.progress >= 1 && mv.path.length > 0) {
        entity.position = { tx: mv.path[0]!.tx, ty: mv.path[0]!.ty };
        mv.path.shift();
        mv.progress -= 1;
      }
      if (mv.path.length === 0) {
        mv.progress = 0;
        continue;
      }
      const next = mv.path[0]!;
      mv.facing = directionFromDelta(
        next.tx - entity.position.tx,
        next.ty - entity.position.ty,
      );
    }
  }
}
