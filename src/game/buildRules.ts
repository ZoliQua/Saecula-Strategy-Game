import { isBuildingAvailable } from './availability';
import { UNIQUE_BUILDINGS } from '../config/balance';
import type { AgeId, BuildingType } from '../types';

export type BuildBlock = 'age-locked' | 'unique-limit';

/** Minimal view of a world entity needed to count a player's buildings. */
interface CountableBuilding {
  readonly building?: { readonly type: BuildingType };
  readonly owner?: { readonly playerId: number };
  readonly dying?: unknown;
}

/** Counts a player's buildings of `type`, finished or still under construction. */
export function countPlayerBuildings(
  entities: Iterable<CountableBuilding>,
  playerId: number,
  type: BuildingType,
): number {
  let n = 0;
  for (const e of entities) {
    if (e.building?.type === type && e.owner?.playerId === playerId && !e.dying) n++;
  }
  return n;
}

/**
 * Why a player may not start `type` right now, or null. Enforced in game
 * logic for both the human and the AI so a locked building can never be placed.
 */
export function buildBlocker(
  type: BuildingType,
  age: AgeId,
  existingOfType: number,
): BuildBlock | null {
  if (!isBuildingAvailable(type, age)) return 'age-locked';
  if (UNIQUE_BUILDINGS.has(type) && existingOfType >= 1) return 'unique-limit';
  return null;
}
