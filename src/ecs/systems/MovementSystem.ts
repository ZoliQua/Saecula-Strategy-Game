import { bonusesFor } from '../../game/modifiers';
import type { PlayerManager } from '../../game/PlayerManager';
import type { MapData } from '../../map/MapData';
import { directionFromDelta } from '../../types';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';

/**
 * Advances entities along their `movable.path` at `movable.speed`
 * tiles per second. When an entity reaches the next tile, its
 * `position` snaps to that tile and `progress` resets for the next
 * step. Empty path → no-op.
 *
 * With the map, a unit on passable ground never steps onto a tile that was
 * blocked after its path was planned (a foundation laid across it): it
 * stops on its tile and re-plans through a `moveIntent` to the path's last
 * tile. If the blocked tile is the last one, it just stops short; every
 * system re-plans from an empty path. A unit standing on blocked ground
 * walks its escape steps (pathfinding) across blocked tiles unhindered.
 */
export class MovementSystem {
  private readonly world: EcsWorld;

  constructor(
    world: EcsWorld,
    private readonly players: PlayerManager | null = null,
    private readonly map: MapData | null = null,
  ) {
    this.world = world;
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    const movers = this.world.with('position', 'movable');
    for (const entity of movers) {
      const mv = entity.movable;
      if (mv.path.length === 0) continue;
      if (this.nextStepBlocked(entity)) {
        this.replan(entity);
        continue;
      }

      mv.progress += mv.speed * bonusesFor(this.players, entity).speedMultiplier * dt;
      while (mv.progress >= 1 && mv.path.length > 0) {
        entity.position = { tx: mv.path[0]!.tx, ty: mv.path[0]!.ty };
        mv.path.shift();
        mv.progress -= 1;
        if (this.nextStepBlocked(entity)) {
          this.replan(entity);
          break;
        }
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

  /** On passable ground, with a next tile that is blocked now. */
  private nextStepBlocked(entity: Entity): boolean {
    const map = this.map;
    const next = entity.movable?.path[0];
    if (!map || !next || !entity.position) return false;
    if (!map.isPassable(entity.position.tx, entity.position.ty)) return false;
    return !map.isPassable(next.tx, next.ty);
  }

  private replan(entity: Entity): void {
    const mv = entity.movable!;
    const last = mv.path.at(-1)!;
    const isLast = mv.path.length === 1;
    mv.path = [];
    mv.progress = 0;
    if (isLast) return;
    if (entity.moveIntent) entity.moveIntent.target = { tx: last.tx, ty: last.ty };
    else this.world.addComponent(entity, 'moveIntent', { target: { tx: last.tx, ty: last.ty } });
  }
}
