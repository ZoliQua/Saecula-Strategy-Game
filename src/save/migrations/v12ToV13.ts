import type { Migration } from './index';

/**
 * v12 (M18) → v13 (M19): no reshaping. The setup's `victory` enum widened
 * with `regicide` and `hill`, the unit-type enum with the king, and an
 * entity may now carry a `hill` component, which no v12 save has. The step
 * exists so the version number is explicit: a v12 reader would reject a v13
 * save of either mode.
 */
export const v12ToV13: Migration = (data) => data;
