import type { Migration } from './index';

/**
 * v3 (M8) → v4 (M9): no reshaping. The setup's `victory` enum widened with
 * the time-victory modes (`conquest_time`, `all`), so every v3 value keeps
 * its meaning. The step exists so the version number is explicit: a v3
 * reader would reject a v4 save of a timed match.
 */
export const v3ToV4: Migration = (data) => data;
