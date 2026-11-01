import type { Migration } from './index';

/**
 * v7 (M13) → v8 (0.8.1): no reshaping. A Medium-family AI state gained an
 * optional `monkAvoid` (the targets its monks gave up on); no v7 save has
 * one. The step exists so the version number is explicit: a v7 reader
 * would reject a v8 save that carries it.
 */
export const v7ToV8: Migration = (data) => data;
