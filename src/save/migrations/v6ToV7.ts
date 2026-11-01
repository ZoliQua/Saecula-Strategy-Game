import type { Migration } from './index';

/**
 * v6 (M12) → v7 (M13): no reshaping. The setup gained an optional
 * `mission` and the save an optional `campaign` objective state; no v6
 * save has either. The step exists so the version number is explicit: a
 * v6 reader would reject a v7 campaign save.
 */
export const v6ToV7: Migration = (data) => data;
