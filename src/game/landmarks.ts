import { LANDMARK } from '../config/balance';
import { landmarkOf } from '../config/civs';
import type { Entity } from '../ecs/components';
import type { EcsWorld } from '../ecs/world';
import type { CivId } from '../types';

/**
 * Landmarks (M17): one per player (UNIQUE_BUILDINGS), its effect from the
 * owner's civ (CivDef.landmark), active only while the landmark stands
 * finished. LandmarkSystem refreshes `Player.landmarkActive` each tick
 * (refreshLandmarks); the modifier kinds read that flag
 * (game/modifiers.ts), the fort shoots through the tower systems
 * (isShootingBuilding), the sauna and the mint run in LandmarkSystem.
 */

/** A finished, standing landmark: the only state in which its effect holds. */
export function isActiveLandmark(e: Entity): boolean {
  return e.building?.type === 'landmark' && !e.underConstruction && !e.dying && (e.health?.current ?? 0) > 0;
}

/** Whether `playerId` has a finished, standing landmark now (a world scan; LandmarkSystem caches it per tick). */
export function hasActiveLandmark(world: EcsWorld, playerId: number): boolean {
  for (const e of world.with('building', 'owner')) {
    if (e.owner.playerId === playerId && isActiveLandmark(e)) return true;
  }
  return false;
}

/**
 * A building that shoots on its own: a tower, or a fort landmark (it gains
 * its attacker once finished, LandmarkSystem). TowerCombatSystem,
 * CombatSystem and CombatFxSystem treat both alike.
 */
export function isShootingBuilding(e: Entity): boolean {
  const type = e.building?.type;
  return type === 'tower' || (type === 'landmark' && e.attacker !== undefined);
}

/** Whether the civ's landmark is a fort (it shoots like a tower). */
export function isFortCiv(civ: CivId): boolean {
  return landmarkOf(civ).kind === 'fort';
}

/** Attack stats of a finished fort landmark (LANDMARK.fort; range from the footprint centre). */
export function fortAttacker(): NonNullable<Entity['attacker']> {
  return {
    meleeAtk: 0,
    pierceAtk: LANDMARK.fort.pierce,
    bonusVsCavalry: 0,
    range: LANDMARK.fort.range,
    cooldownMs: LANDMARK.fort.cooldownMs,
    cooldownRemaining: 0,
  };
}

/**
 * Where a shooter's range is measured from: a unit's tile, a building's
 * footprint centre (a 1×1 tower: its tile; a 3×3 fort: the middle tile).
 */
export function shotOrigin(e: Required<Pick<Entity, 'position'>> & Entity): { tx: number; ty: number } {
  const fp = e.building?.footprint;
  if (!fp || (fp.width === 1 && fp.height === 1)) return e.position;
  return { tx: e.position.tx + (fp.width - 1) / 2, ty: e.position.ty + (fp.height - 1) / 2 };
}

/** Chebyshev distance from `at` to the footprint at `origin` (0 on it). */
export function distanceToFootprint(at: { tx: number; ty: number }, origin: { tx: number; ty: number }, fp: { width: number; height: number }): number {
  const dx = Math.max(origin.tx - at.tx, 0, at.tx - (origin.tx + fp.width - 1));
  const dy = Math.max(origin.ty - at.ty, 0, at.ty - (origin.ty + fp.height - 1));
  return Math.max(dx, dy);
}
