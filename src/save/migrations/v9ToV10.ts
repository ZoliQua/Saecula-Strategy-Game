import { MODE_DEFAULTS } from '../../game/matchModes';
import type { Migration } from './index';

/**
 * v9 (0.9.2 / 1.0) → v10 (M16): the setup gains the mode fields; a v9
 * match was played without allies or treaty, with normal starting
 * resources at 1× speed, so it gets exactly those (MODE_DEFAULTS).
 * A setup that is not an object is left for the schema to reject.
 */
export const v9ToV10: Migration = (data) => {
  const setup = data['setup'];
  if (typeof setup !== 'object' || setup === null || Array.isArray(setup)) return data;
  return { ...data, setup: { ...setup, ...MODE_DEFAULTS } };
};
