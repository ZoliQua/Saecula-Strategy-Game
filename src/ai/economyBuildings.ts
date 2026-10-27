import { AI_COMMON } from '../config/aiBalance';
import type { Entity } from '../ecs/components';
import type { TileCoord } from '../iso/coordinates';
import type { BuildingType, Population, ResourceType } from '../types';
import { chebyshev } from './decisions/gathering';
import { needsHouse } from './decisions/housing';
import { clusterAnchor } from './decisions/placement';
import type { WorldView } from './perception';
import { foodSpots, gatherCounts } from './workforce';

/** Places a site of `type` near `anchor` (rule checks and payment are the caller's). */
export type BuildFn = (type: BuildingType, anchor: TileCoord) => Entity | null;

const CAMP_FOR: Readonly<Record<'wood' | 'gold', BuildingType>> = { wood: 'lumber_camp', gold: 'mining_camp' };

/** Centre of the base: the town centre's middle tile (or any own building). */
export function baseAnchor(view: WorldView): TileCoord | null {
  const tc = view.townCenter ?? view.buildings[0];
  if (!tc?.position) return null;
  const w = tc.building?.footprint.width ?? 1;
  const h = tc.building?.footprint.height ?? 1;
  return { tx: tc.position.tx + Math.floor(w / 2), ty: tc.position.ty + Math.floor(h / 2) };
}

/** A house when the population is close to the cap (one at a time). */
export function buildHouseIfNeeded(view: WorldView, pop: Population, build: BuildFn): Entity | null {
  const anchor = baseAnchor(view);
  if (!anchor) return null;
  const inProgress = view.buildings.filter((b) => b.building?.type === 'house' && b.underConstruction).length;
  if (!needsHouse(pop, inProgress, AI_COMMON.houseMargin)) return null;
  return build('house', anchor);
}

/** More food gatherers are wanted than there are food spots, and no farm is already going up. */
export function farmNeeded(view: WorldView, wantedFood: number): boolean {
  const anchor = baseAnchor(view);
  if (!anchor) return false;
  if (view.buildings.some((b) => b.building?.type === 'farm' && b.underConstruction)) return false;
  return foodSpots(view, anchor, AI_COMMON.berryRadius) < wantedFood;
}

/** A farm in the ring around the TC when `farmNeeded`. */
export function buildFarmIfNeeded(view: WorldView, wantedFood: number, build: BuildFn): Entity | null {
  const anchor = baseAnchor(view);
  if (!anchor || !farmNeeded(view, wantedFood)) return null;
  return build('farm', anchor);
}

/** Nearest own drop-off accepting `type`, as a distance from `at` (Infinity when none). */
function dropoffDistance(view: WorldView, type: ResourceType, at: TileCoord): number {
  let best = Infinity;
  for (const b of view.buildings) {
    if (!b.position || !b.building) continue;
    const accepts = b.resourceDropoff?.accepts ?? (b.underConstruction ? campAccepts(b.building.type) : []);
    if (!accepts.includes(type)) continue;
    best = Math.min(best, chebyshev(b.position, at));
  }
  return best;
}

function campAccepts(type: BuildingType): readonly ResourceType[] {
  if (type === 'lumber_camp') return ['wood'];
  if (type === 'mining_camp') return ['gold'];
  if (type === 'town_center') return ['food', 'wood', 'gold'];
  return [];
}

/**
 * A lumber / mining camp next to the nearest known cluster of that
 * resource when enough villagers work it and the closest drop-off is far.
 */
export function buildCampIfNeeded(view: WorldView, type: 'wood' | 'gold', build: BuildFn): Entity | null {
  const home = baseAnchor(view);
  if (!home) return null;
  if (gatherCounts(view)[type] < AI_COMMON.campMinGatherers[type]) return null;
  const cluster = clusterAnchor(view.resources[type], home, AI_COMMON.clusterRadius);
  if (!cluster) return null;
  if (dropoffDistance(view, type, cluster) <= AI_COMMON.campDistance) return null;
  return build(CAMP_FOR[type], cluster);
}

/**
 * A construction site no villager is building (its builders were killed
 * or taken), so it is not left half-built for good. Wall segments are
 * walked line by line elsewhere. Sites far out from the base centre, or
 * with an armed enemy in sight close by, are left: fresh builders would
 * walk into the fight that emptied them.
 */
export function unstaffedSite(view: WorldView): Entity | undefined {
  const staffed = new Set<number>();
  for (const v of view.villagers) if (v.buildCommand) staffed.add(v.buildCommand.targetId);
  const home = baseAnchor(view);
  const armed = view.visibleEnemyUnits.filter((u) => u.attacker !== undefined && u.unit?.unitType !== 'villager' && u.unit?.unitType !== 'scout');
  return view.buildings.find((b) => {
    if (!b.underConstruction || b.building?.type === 'wall' || b.id === undefined || staffed.has(b.id) || !b.position) return false;
    if (home && distanceToFootprint(home, b) > AI_COMMON.restaffRadius) return false;
    return !armed.some((u) => u.position && distanceToFootprint(u.position, b) <= AI_COMMON.restaffThreatRadius);
  });
}

/** Chebyshev tiles from `p` to the nearest tile of building `b`'s footprint. */
function distanceToFootprint(p: TileCoord, b: Entity): number {
  const o = b.position ?? p;
  const w = b.building?.footprint.width ?? 1;
  const h = b.building?.footprint.height ?? 1;
  const dx = Math.max(o.tx - p.tx, 0, p.tx - (o.tx + w - 1));
  const dy = Math.max(o.ty - p.ty, 0, p.ty - (o.ty + h - 1));
  return Math.max(dx, dy);
}
