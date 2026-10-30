import { UNIT_BALANCE } from '../config/balance';
import { CIV_DEFS } from '../config/civs';
import { BASE_UNIT_TYPES, type BaseUnitType, type CivId, type UniqueUnitType, type UnitType } from '../types';

/** The base unit a unit stands in for (a base type maps to itself). */
export function baseUnitType(t: UnitType): BaseUnitType {
  return UNIT_BALANCE[t].replaces ?? (t as BaseUnitType);
}

export function isUniqueUnit(t: UnitType): t is UniqueUnitType {
  return UNIT_BALANCE[t].replaces !== undefined;
}

/** The unit a civ trains in the slot of `base` (its unique unit if it replaces that slot). */
export function civUnitType(civ: CivId, base: BaseUnitType): UnitType {
  const unique = CIV_DEFS[civ].uniqueUnit;
  return UNIT_BALANCE[unique].replaces === base ? unique : base;
}

/** All 10 unit types a civ can train, in BASE_UNIT_TYPES order. */
export function civUnitTypes(civ: CivId): UnitType[] {
  return BASE_UNIT_TYPES.map((b) => civUnitType(civ, b));
}

export function canCivTrain(civ: CivId, t: UnitType): boolean {
  return civUnitType(civ, baseUnitType(t)) === t;
}
