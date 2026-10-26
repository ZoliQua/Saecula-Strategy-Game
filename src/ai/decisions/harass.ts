import type { TileCoord } from '../../iso/coordinates';
import type { BuildingType } from '../../types';
import { chebyshev } from './gathering';

/** A remembered enemy villager (see perception `enemyVillagers`). */
export interface SeenVillager {
  readonly ownerId: number;
  readonly position: TileCoord;
  readonly seenAtMs: number;
}

/** A remembered enemy building that shoots (towers), to keep raids away from. */
export interface KnownDanger {
  readonly type: BuildingType;
  readonly ownerId: number;
  readonly position: TileCoord;
}

export interface HarassTargetOptions {
  readonly enemyId: number | undefined;
  readonly home: TileCoord;
  /** Villagers this close (tiles) to each other count as one work spot. */
  readonly clusterRadius: number;
  /** Spots this close (tiles) to a known enemy tower are skipped. */
  readonly avoidRadius: number;
}

export interface HarassTarget {
  readonly position: TileCoord;
  readonly villagers: number;
}

/**
 * Where a villager raid should go: the remembered work spot with the
 * most enemy villagers (of `enemyId`), never one covered by a known enemy
 * tower. Ties go to the most recently seen spot, then the one nearest
 * home. Null when no villager of that enemy has been seen.
 */
export function pickHarassTarget(
  seen: readonly SeenVillager[],
  dangers: readonly KnownDanger[],
  options: HarassTargetOptions,
): HarassTarget | null {
  const mine = seen.filter((v) => options.enemyId === undefined || v.ownerId === options.enemyId);
  const towers = dangers.filter((d) => d.type === 'tower' && (options.enemyId === undefined || d.ownerId === options.enemyId));
  let best: { target: HarassTarget; freshest: number; distance: number } | null = null;
  for (const seed of mine) {
    if (towers.some((t) => chebyshev(t.position, seed.position) <= options.avoidRadius)) continue;
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
