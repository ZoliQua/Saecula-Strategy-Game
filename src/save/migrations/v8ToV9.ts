import type { Migration } from './index';

/**
 * v8 (0.8.1) → v9 (M14): no reshaping. The unit and building enums gain
 * the ships and the dock, the terrain the fish school (id 6), and an
 * entity may carry `cargo`, `boardIntent`, `unloadIntent` and a node
 * `resourceNode.sea`; no v8 save has any. The step exists so the version
 * number is explicit: a v8 reader would reject a v9 save that has them.
 */
export const v8ToV9: Migration = (data) => data;
