import type { Migration } from './index';

/**
 * v5 (M11) → v6 (M12): no reshaping. The technology enum widened with the
 * ten M12 technologies (players' `researched`, buildings' `research`, the
 * AI's research plans), so every v5 value is still valid. The step exists
 * so the version number is explicit: a v5 reader would reject a v6 save
 * holding a new technology.
 */
export const v5ToV6: Migration = (data) => data;
