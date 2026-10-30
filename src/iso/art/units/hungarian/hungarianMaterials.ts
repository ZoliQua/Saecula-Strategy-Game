import type { Material } from '../materials';

/**
 * Hungarian unique-unit palette (M8): the hussar's dark wolf fur, white
 * frogging cord on team cloth, the red-and-gold sash, dark blue
 * breeches and yellow Cordovan boots (csizma). The shared base look is
 * the Hungarian look, so these serve the hussar only.
 */
const CORD_WHITE = 0xf2eee4;

export const HUNGARIAN_M = {
  /** Dark wolf fur of the kalpag and the pelisse trim. */
  fur: { color: 0x3a2c22, bands: { count: 7, width: 0.35 } } as Material,
  /** Heron plume (forgó) of the kalpag. */
  plume: { color: 0xf4f1ea } as Material,
  /** Team dolman under rows of white frogging cord. */
  dolman: { color: 0xffffff, team: true, bands: { count: 8, color: CORD_WHITE, width: 0.11 } } as Material,
  /** Gold-and-red barrel sash (öv). */
  sash: { color: 0xd4a84e, metal: 0.4, bands: { count: 3, color: 0xa82a24, width: 0.4 } } as Material,
  /** Dark blue breeches (nadrág). */
  breeches: { color: 0x2b3452 } as Material,
  /** Yellow Cordovan leather boots (csizma). */
  csizma: { color: 0xc89632 } as Material,
} as const;
