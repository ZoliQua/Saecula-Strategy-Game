import type { Migration } from './index';

/**
 * v14 (M20) → v15 (M21): no reshaping. The civ enum widened with polish and
 * ottoman, the unit-type enum with their unique units (winged_hussar,
 * janissary). The step exists so the version number is explicit: a v14
 * reader would reject a v15 save that uses one of them.
 */
export const v14ToV15: Migration = (data) => data;
