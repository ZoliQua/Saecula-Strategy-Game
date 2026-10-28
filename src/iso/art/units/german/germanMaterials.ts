import type { Material } from '../materials';

/**
 * German unit palette (M5, CLAUDE.md §4.2): black, gold and red — the
 * registry heraldry (config/civs.ts german: primary black, secondary
 * gold, accent red) — on undyed and red wool, black leather and
 * blackened iron. The black eagle sits on the knights' gold shields.
 */
const EAGLE_BLACK = 0x1a1a1a;
const IMPERIAL_GOLD = 0xd4a017;
const IMPERIAL_RED = 0xb3202a;

export const GERMAN_M = {
  eagle: { color: EAGLE_BLACK } as Material,
  goldField: { color: IMPERIAL_GOLD, metal: 0.25 } as Material,
  red: { color: IMPERIAL_RED } as Material,
  /** Undyed wool (villagers' hose, Germanic trousers). */
  loden: { color: 0x7d7058 } as Material,
  /** Dark red-brown wool hose. */
  hose: { color: 0x7a2a22 } as Material,
  /** Black leather (spiked helms, belts, the riders' boots). */
  blackLeather: { color: 0x1f1b19, metal: 0.25 } as Material,
  /** Lime-washed linden boards of the oval shield's back and rim binding. */
  board: { color: 0xc9b088 } as Material,
  /** Ostrich plumes of the Landsknecht beret. */
  plume: { color: 0xf3efe4 } as Material,
  /** Puffed-and-slashed team doublet: gold under-cloth shows through the slashes. */
  slashed: { color: 0xffffff, team: true, bands: { count: 6, color: IMPERIAL_GOLD, width: 0.12 } } as Material,
  /** Heater shield: a gold field in a dark edge inside a team rim (the eagle is painted over it, germanGear.ts). */
  eagleShield: {
    color: 0xffffff,
    team: true,
    charge: { field: IMPERIAL_GOLD, cross: IMPERIAL_GOLD, front: 0.6, panel: 1, bar: -1, armAt: 0, arm: -1, edge: 0x2a2422, edgeWidth: 0.1 },
  } as Material,
  /** Blackened iron barrel with gilt rings (the Hungarian gun is bronze, the English iron). */
  barrel: { color: 0x2f2d2c, metal: 0.5, bands: { count: 4, color: IMPERIAL_GOLD, width: 0.09 } } as Material,
  /** Black horse of the cuirassiers. */
  black: { color: 0x2a2220 } as Material,
} as const;
