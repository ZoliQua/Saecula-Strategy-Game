import type { Material } from '../materials';

/** White eagle and its gilt crown, beak and talons (heraldry secondary, accent). */
const EAGLE_WHITE = 0xf2efe6;
const CROWN_GOLD = 0xd4a017;

/**
 * Polish unit palette (M21, CLAUDE.md §4.2): red, white and gold — the
 * registry heraldry (config/civs.ts polish: primary crimson, secondary
 * white, accent gold) — kept off the team-coloured cloth, so a red team
 * still reads as the owner: the white and gold only in the eagle on the
 * knight's shield and in gilt rims, ribs and studs; the crimson only in
 * the lacquered frames of the hussar wings; the legs dark wool, the
 * riders' boots yellow morocco.
 */
export const POLISH_M = {
  eagle: { color: EAGLE_WHITE } as Material,
  crown: { color: CROWN_GOLD, metal: 0.8 } as Material,
  /** Dark outline round the eagle (and the shield's edge), so the white charge holds on a white team. */
  eagleEdge: { color: 0x2a2224 } as Material,
  /** Dark brown homespun of the legs (well apart from any team colour). */
  wool: { color: 0x4e3e30 } as Material,
  /** Yellow morocco boots of the hussars and the musketeers' hajduk boots. */
  yellowBoot: { color: 0xc9962e } as Material,
  /** Studded iron rim of the round Slavic shield. */
  rimIron: { color: 0x4c4f55, metal: 0.55, bands: { count: 3, color: 0xa8acb2, width: 0.12 } } as Material,
  /** Crimson-lacquered wood of the hussar wing frames. */
  wingFrame: { color: 0x8a1f24, metal: 0.25 } as Material,
  /** White eagle and crane feathers of the hussar wings. */
  wingFeather: { color: 0xf0ece2 } as Material,
  /** Darker feather tips, every other feather, so the wing reads as feathers, not a plank. */
  wingTip: { color: 0x9a948a } as Material,
  /** Black felt of the magierka's turned-up brim. */
  felt: { color: 0x26221f } as Material,
  /** Bronze gun with gilt rings. */
  barrel: { color: 0xb07a3a, metal: 0.85, bands: { count: 3, color: CROWN_GOLD, width: 0.1 } } as Material,
  /** Bay horses with black manes; the hussars ride greys. */
  bay: { color: 0x8a5a30 } as Material,
} as const;
