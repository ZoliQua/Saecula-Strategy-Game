import type { Material } from '../materials';

/** Nordic cross: blue on white (heraldry secondary, primary). */
const CROSS_BLUE = 0x1f4f9a;
const CROSS_WHITE = 0xf2efe6;
/** Dark outline round the cross's white field, so it stays apart from a white or blue team. */
const CROSS_EDGE = 0x1a1c22;

/**
 * Finnish unit palette (M5, CLAUDE.md §4.2): white, blue and grey — the
 * registry heraldry (config/civs.ts finnish: primary white, secondary
 * blue, accent grey) — kept off the team-coloured cloth so a blue team
 * still reads as the owner: the blue and white only in the knight's
 * Nordic cross, its white field outlined dark; the grey in the wool
 * legs and the grey sheepskin of the karvalakki; the round shields of
 * pale lime wood round a team field.
 */
export const FINNISH_M = {
  crossEdge: { color: CROSS_EDGE } as Material,
  /** Heater shield: the Nordic cross on a white field inside a team rim, the field outlined dark. */
  crossShield: {
    color: 0xffffff,
    team: true,
    charge: { field: CROSS_WHITE, cross: CROSS_BLUE, front: 0.62, panel: 1, bar: 0.18, armAt: 0.6, arm: 0.09, edge: CROSS_EDGE, edgeWidth: 0.1 },
  } as Material,
  /** Pale lime (linden) wood of the round shields' rims. */
  lime: { color: 0xcdb27c } as Material,
  /** Brown bear fur of the age-1 caps' brims. */
  fur: { color: 0x5a4330 } as Material,
  /** Grey sheepskin of the karvalakki. */
  greyFur: { color: 0x8e8882 } as Material,
  /** Grey homespun wool trousers (the civ's grey; well apart from any team blue). */
  wool: { color: 0x5a5b5e } as Material,
  /** Blackened iron of the hakkapeliitta's lobster-pot helm. */
  blackIron: { color: 0x3c3f45, metal: 0.55 } as Material,
  /** Cast-iron gun of the Finnish ironworks, blue-black with pale rings (the English gun is plain grey iron). */
  barrel: { color: 0x363b44, metal: 0.6, bands: { count: 2, color: 0x9aa0a8, width: 0.1 } } as Material,
  /** Off-white wool of the sissi's snow hood and cloak (M8): a touch warm, so it reads apart from a white team. */
  snow: { color: 0xe9e6dc } as Material,
  /** Birch bark of the sissi's quiver. */
  birchBark: { color: 0xd8d0be, bands: { count: 4, color: 0x3a3430, width: 0.1 } } as Material,
  /** Grey wool mittens. */
  mitten: { color: 0x6e6a66 } as Material,
  /** Chestnut Finnhorses with flaxen manes. */
  chestnut: { color: 0x8a5228 } as Material,
  flaxen: { color: 0xd8c38c } as Material,
} as const;
