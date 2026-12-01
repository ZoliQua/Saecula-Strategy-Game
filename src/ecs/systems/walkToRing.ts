import type { With } from 'miniplex';
import type { TileCoord } from '../../iso/coordinates';
import type { MapData } from '../../map/MapData';
import type { PathAllowance } from '../../map/pathBudget';
import { findPath, findPathToAny } from '../../map/pathfinding';
import type { Entity } from '../components';
import { escapeRulesAt } from '../escapeRules';
import { onFootprintRing, type FootprintSize } from '../footprint';
import type { EcsWorld } from '../world';
import { findAdjacentToFootprint } from './gathering/gatherGeometry';

/** A unit sent to work a building from the ring around its footprint (a builder, a repairer). */
export type RingWalker = With<Entity, 'position' | 'movable'>;

/**
 * Plans `unit` a path to the ring of tiles around the footprint at
 * `origin` (the passable ring tile nearest to it first; a cut-off one
 * falls back to the nearest reachable ring tile). 'budget' when no A*
 * search is left this tick (try again next tick), 'failed' when there is
 * no way (the caller waits before retrying), 'planned' when the path is set.
 */
export function planToFootprintRing(
  world: EcsWorld,
  map: MapData,
  paths: PathAllowance,
  unit: RingWalker,
  origin: TileCoord,
  size: FootprintSize,
): 'planned' | 'budget' | 'failed' {
  const goal = findAdjacentToFootprint(map, { position: origin, building: { footprint: size } }, unit.position);
  if (goal && !paths.take()) return 'budget';
  const escape = escapeRulesAt(world, unit.position, map, unit.owner?.playerId ?? 0);
  const path = goal
    ? (findPath(map, unit.position, goal, escape) ??
      findPathToAny(map, unit.position, (tx, ty) => onFootprintRing({ tx, ty }, origin, size), escape))
    : null;
  if (!path) return 'failed';
  unit.movable.path = path.slice(1);
  unit.movable.progress = 0;
  return 'planned';
}
