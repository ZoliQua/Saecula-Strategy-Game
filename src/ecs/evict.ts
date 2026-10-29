import type { TileCoord } from '../iso/coordinates';
import { escapeSteps } from '../map/escape';
import type { MapData } from '../map/MapData';
import { findPath } from '../map/pathfinding';
import type { Entity } from './components';
import { footprintEscape } from './escapeRules';
import { insideFootprint, type FootprintSize } from './footprint';
import type { EcsWorld } from './world';

/**
 * Sends every living unit standing on a freshly placed footprint off it,
 * whoever owns it: its `movable.path` crosses only that footprint and leaves
 * onto a free tile of its ring, preferring one from which the unit's
 * destination or order target can be reached (never through a neighbouring
 * building or wall). Only when that ring is blocked all round does it cross
 * a neighbouring building of its own owner or Gaia (never another player's,
 * a wall segment or impassable terrain) to the nearest free tile; enclosed
 * by anything else, it stays. A unit that was walking somewhere gets the way to its
 * destination through that tile. Orders (build command, gather target,
 * attack) are kept, so a builder evicted from its own site steps out and
 * builds.
 *
 * Call it after the building was created, when the footprint is blocked.
 * Used by every foundation placement: the human's buildings and walls and
 * the AI's. The searches are not charged to the per-frame path budget: they
 * run only at placement time, for the few units on the footprint, and the
 * escape itself is a flood over the footprint alone.
 */
export function evictUnitsFrom(world: EcsWorld, map: MapData, origin: TileCoord, footprint: FootprintSize): void {
  for (const e of world.with('position', 'movable', 'unit')) {
    if (e.dying || !insideFootprint(e.position, origin, footprint)) continue;
    const rules = footprintEscape(origin, footprint, world, map, e.owner?.playerId ?? 0);
    const destination = e.movable.path.at(-1);
    const path = destination
      ? findPath(map, e.position, destination, rules)
      : escapeSteps(map, e.position, rules, orderTarget(world, e));
    if (!path || path.length < 2) continue;
    e.movable.path = path.slice(1);
    e.movable.progress = 0;
  }
}

/** Where the unit's current order points: a move target, or its build site, gather node or attack target. */
function orderTarget(world: EcsWorld, e: Entity): TileCoord | undefined {
  if (e.moveIntent) return e.moveIntent.target;
  const id = e.buildCommand?.targetId ?? e.gatherer?.targetNodeId ?? e.attackIntent?.targetId;
  if (id === undefined) return undefined;
  for (const t of world.entities) if (t.id === id) return t.position;
  return undefined;
}
