import { LANDMARK, TOWER_ATTACK } from '../../config/balance';
import { type TileCoord, chebyshev } from '../../iso/coordinates';
import { footprintCentre } from '../../ecs/footprint';
import type { BuildingType } from '../../types';

/** A remembered enemy villager (see perception `enemyVillagers`). */
export interface SeenVillager {
  readonly ownerId: number;
  readonly position: TileCoord;
  readonly seenAtMs: number;
}

/** A remembered enemy building, of which the ones that shoot (towers, fort landmarks) keep raids away. */
export interface KnownDanger {
  readonly type: BuildingType;
  readonly ownerId: number;
  readonly position: TileCoord;
  readonly footprint?: { readonly width: number; readonly height: number };
  /** A building other than a tower seen shooting (a finished fort landmark, M17). */
  readonly shoots?: true | undefined;
}

/**
 * Whether `d` covers the spot `p` (within `radius` of a tower): a tower by
 * its tile; a fort landmark from its footprint centre, its radius widened by
 * how much further a fort shoots than a tower (LANDMARK.fort vs TOWER_ATTACK).
 */
function covers(d: KnownDanger, p: TileCoord, radius: number): boolean {
  if (d.type === 'tower') return chebyshev(d.position, p) <= radius;
  if (d.shoots !== true) return false;
  const centre = footprintCentre(d.position, d.footprint ?? { width: 1, height: 1 });
  return chebyshev(centre, p) <= radius + LANDMARK.fort.range - TOWER_ATTACK.range;
}

export interface HarassTargetOptions {
  readonly enemyId: number | undefined;
  readonly home: TileCoord;
  /** Villagers this close (tiles) to each other count as one work spot. */
  readonly clusterRadius: number;
  /** Spots this close (tiles) to a known enemy tower are skipped (a fort landmark: further, see `covers`). */
  readonly avoidRadius: number;
}

export interface HarassTarget {
  readonly position: TileCoord;
  readonly villagers: number;
}

/**
 * Where a villager raid should go: the remembered work spot with the
 * most enemy villagers (of `enemyId`), never one covered by a known enemy
 * tower or fort landmark (M17). Ties go to the most recently seen spot, then the one nearest
 * home. Null when no villager of that enemy has been seen.
 */
export function pickHarassTarget(
  seen: readonly SeenVillager[],
  dangers: readonly KnownDanger[],
  options: HarassTargetOptions,
): HarassTarget | null {
  const mine = seen.filter((v) => options.enemyId === undefined || v.ownerId === options.enemyId);
  const towers = dangers.filter((d) => (d.type === 'tower' || d.shoots === true) && (options.enemyId === undefined || d.ownerId === options.enemyId));
  let best: { target: HarassTarget; freshest: number; distance: number } | null = null;
  for (const seed of mine) {
    if (towers.some((t) => covers(t, seed.position, options.avoidRadius))) continue;
    const cluster = mine.filter((v) => chebyshev(v.position, seed.position) <= options.clusterRadius);
    const freshest = Math.max(...cluster.map((v) => v.seenAtMs));
    const distance = chebyshev(seed.position, options.home);
    const better =
      !best ||
      cluster.length > best.target.villagers ||
      (cluster.length === best.target.villagers &&
        (freshest > best.freshest || (freshest === best.freshest && distance < best.distance)));
    if (better) best = { target: { position: seed.position, villagers: cluster.length }, freshest, distance };
  }
  return best?.target ?? null;
}

/** A raid falls back when the armed enemies around it outnumber it (`ratio` armed enemies per raider). */
export function raidOutnumbered(raiders: number, armedEnemiesNear: number, ratio: number): boolean {
  return raiders <= 0 || armedEnemiesNear > raiders * ratio;
}
