import type { Material } from '../materials';

/** White of the crescent and of the janissaries' felt (heraldry secondary). */
const FELT_WHITE = 0xf2efe6;
/** Green of the Ottoman heraldry (accent): bow grips, saddle cloths' trim. */
const GREEN = 0x1f7a3a;

/**
 * Ottoman unit palette (M21, CLAUDE.md §4.2): red, green and white — the
 * registry heraldry (config/civs.ts ottoman: primary red, secondary
 * white, accent green) — kept off the team-coloured cloth, so a red
 * team still reads as the owner: the white in the börk's felt and the
 * turban wraps, the green in the bow grips and the shield bosses' rims;
 * the legs wide dark-blue şalvar, the boots red or yellow morocco.
 */
export const OTTOMAN_M = {
  /** White felt of the börk (the janissaries' tall cap). */
  felt: { color: FELT_WHITE } as Material,
  /** Darker fold line of the börk's hanging back, so the white cap reads as a fold, not a blob. */
  feltShade: { color: 0xc9c2b2 } as Material,
  /** White linen of the turban wraps round the helms. */
  turban: { color: 0xece6d6, bands: { count: 4, color: 0xc8c0ae, width: 0.18 } } as Material,
  /** Dark indigo şalvar of the legs (well apart from any team colour). */
  salvar: { color: 0x2e3346 } as Material,
  /** Red morocco boots (çizme) of the foot. */
  redBoot: { color: 0x8a2a22 } as Material,
  /** Yellow morocco boots of the riders and the janissaries. */
  yellowBoot: { color: 0xc89a34 } as Material,
  /** Heraldic green of the bow grips and the boss rings. */
  green: { color: GREEN } as Material,
  /** Horn belly of the composite recurve bow, dark lacquered. */
  horn: { color: 0x3a2a20, metal: 0.25 } as Material,
  /** Brass spoon-holder plate on the börk's front, and the plume's holder. */
  brass: { color: 0xd8ac4c, metal: 0.85 } as Material,
  /** Bronze gun with gilt rings. */
  barrel: { color: 0xa87838, metal: 0.85, bands: { count: 4, color: 0xd8ac4c, width: 0.08 } } as Material,
  /** Grey horses with dark manes; the knights ride dark bays. */
  grey: { color: 0xcfc6b8 } as Material,
} as const;
