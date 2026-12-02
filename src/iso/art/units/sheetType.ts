import { baseUnitType, civUnitType } from '../../../game/civUnits';
import type { BaseUnitType, CivId, UnitType } from '../../../types';

/** A base slot with a sheet of its own: every base type but the king (M19). */
export type SheetSlot = Exclude<BaseUnitType, 'king'>;

/** The base slot whose sheet a unit type is drawn from, where no civ is needed (layout, walk cycle). */
export function unitSheetSlot(type: UnitType): SheetSlot {
  const base = baseUnitType(type);
  return base === 'king' ? 'knight' : base;
}

/**
 * The unit type whose sheet draws `type` for a civ: the type itself, but
 * for the king the civ's unit of the knight slot (the Hungarian hussar).
 * Every texture key, look, geometry and portrait lookup goes through
 * this, so the king never gets a sheet or cache entry of its own.
 */
export function unitSheetType(type: UnitType, civ: CivId): UnitType {
  return type === 'king' ? civUnitType(civ, unitSheetSlot(type)) : type;
}
