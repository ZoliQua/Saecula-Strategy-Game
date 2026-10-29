import type { TileCoord } from '../iso/coordinates';
import type { MapData } from '../map/MapData';
import { escapeSteps, findPath } from '../map/pathfinding';
import { insideFootprint } from './footprint';
import type { EcsWorld } from './world';

/**
 * Sends every living unit standing on a freshly placed footprint off it:
 * its `movable.path` becomes the way to the nearest passable tile outside
 * (or, for a unit that was walking somewhere, the way to its destination
 * through that tile). Orders (build command, gather target, attack) are
 * kept, so a builder evicted from its own site steps out and builds.
 *
 * Call it after the building was created, when the footprint is blocked.
 * Used by every foundation placement: the human's buildings and walls and
 * the AI's.
 */
export function evictUnitsFrom(
  world: EcsWorld,
  map: MapData,
  origin: TileCoord,
  footprint: { width: number; height: number },
): void {
  for (const e of world.with('position', 'movable', 'unit')) {
    if (e.dying) continue;
    if (!insideFootprint(e.position, origin, footprint)) continue;
    const destination = e.movable.path.at(-1);
    const path = destination ? findPath(map, e.position, destination) : escapeSteps(map, e.position);
    if (!path || path.length < 2) continue;
    e.movable.path = path.slice(1);
    e.movable.progress = 0;
  }
}
