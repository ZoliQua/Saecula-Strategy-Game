import type { Migration } from './index';

/**
 * v13 (M19) → v14 (M20): no reshaping. The setup's `mission` enum widened
 * with the chapter-2 missions and the short scenarios. The step exists so
 * the version number is explicit: a v13 reader would reject a v14 save of
 * one of them.
 */
export const v13ToV14: Migration = (data) => data;
