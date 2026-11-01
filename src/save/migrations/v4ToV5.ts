import type { Migration } from './index';

/**
 * v4 (M10) → v5 (M11): no reshaping. The unit- and building-type enums
 * widened with the monk and the monastery, and three optional components
 * were added (convertIntent, converter, originCiv) that no v4 entity has.
 * The step exists so the version number is explicit: a v4 reader would
 * reject a v5 save holding a monk.
 */
export const v4ToV5: Migration = (data) => data;
