import type { With } from 'miniplex';
import type { MapData } from '../../map/MapData';
import { findPathToNearest } from '../../map/pathfinding';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';

type PathableEntity = With<Entity, 'position' | 'moveIntent' | 'movable'>;

/**
 * Turns a `moveIntent` into a `movable.path` via A*. Runs once per
 * tick. A target that is walled off or blocked resolves to the nearest
 * reachable tile; if the unit is already as close as it can get, the intent
 * is dropped (never retried, so no repath loops).
 */
export class PathfindingSystem {
  private readonly world: EcsWorld;
  private readonly mapData: MapData;

  constructor(world: EcsWorld, mapData: MapData) {
    this.world = world;
    this.mapData = mapData;
  }

  update(): void {
    const pending = this.world.with('position', 'moveIntent', 'movable');
    for (const entity of pending) {
      this.resolve(entity);
    }
  }

  private resolve(entity: PathableEntity): void {
    const target = entity.moveIntent.target;
    if (target.tx === entity.position.tx && target.ty === entity.position.ty) {
      this.world.removeComponent(entity as Entity, 'moveIntent');
      return;
    }
    const path = findPathToNearest(this.mapData, entity.position, target);
    if (!path || path.length < 2) {
      this.world.removeComponent(entity as Entity, 'moveIntent');
      return;
    }
    // path[0] is the current tile; drop it — `movable.path` only holds
    // upcoming steps.
    entity.movable.path = path.slice(1);
    entity.movable.progress = 0;
    this.world.removeComponent(entity as Entity, 'moveIntent');
  }
}
