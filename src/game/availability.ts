import { BUILDING_BALANCE, UNIT_BALANCE } from '../config/balance';
import type { AgeId, BuildingType, TechId, UnitType } from '../types';
import { TECH_SPECS } from './technologies';

/** What availability depends on: the player's age and finished technologies. */
export interface PlayerProgress {
  readonly age: AgeId;
  readonly researched: ReadonlySet<TechId>;
}

export function isUnitAvailable(type: UnitType, age: AgeId): boolean {
  return age >= UNIT_BALANCE[type].age;
}

export function isBuildingAvailable(type: BuildingType, age: AgeId): boolean {
  return age >= BUILDING_BALANCE[type].age;
}

/** A technology can be started: age reached, prerequisites done, not yet researched. */
export function isTechAvailable(id: TechId, progress: PlayerProgress): boolean {
  const spec = TECH_SPECS[id];
  if (progress.researched.has(id)) return false;
  if (progress.age < spec.requiredAge) return false;
  return spec.prerequisites.every((p) => progress.researched.has(p));
}

export const unitRequiredAge = (type: UnitType): AgeId => UNIT_BALANCE[type].age;
export const buildingRequiredAge = (type: BuildingType): AgeId => BUILDING_BALANCE[type].age;
export const techRequiredAge = (id: TechId): AgeId => TECH_SPECS[id].requiredAge;
