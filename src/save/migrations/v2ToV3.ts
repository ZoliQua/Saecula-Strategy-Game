import type { Migration } from './index';

/**
 * v2 (M7) → v3 (M8): no reshaping. The only schema change is that the
 * `unitType` enum widened to include the eight civ-unique units, so every
 * v2 value is still valid. Which units a civ trains is not saved (it comes
 * from the civ registry), so a v2 save's knights and cavalry stay as they
 * are while its civ's buildings now offer the unique unit instead. The
 * step exists so the version number is explicit: a v2 reader would reject
 * a v3 save holding a unique unit.
 */
export const v2ToV3: Migration = (data) => data;
