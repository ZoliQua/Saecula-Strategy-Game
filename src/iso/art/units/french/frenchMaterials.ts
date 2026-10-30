import type { Material } from '../materials';

/**
 * French unit palette (M5, CLAUDE.md §4.2): blue, gold and white — the
 * registry heraldry (config/civs.ts french: primary royal blue,
 * secondary gold, accent white) — kept off the team-coloured cloth: the
 * blue only on hose and breeches in a dark navy (never a team-like
 * royal blue), gold on the fleurs-de-lis, braid and hat lace, white on
 * breeches, cockades and the cuirassier's crest base.
 */
const LILY_GOLD = 0xe8c547;
const ROYAL_NAVY = 0x22283c;

export const FRENCH_M = {
  /** Gold of the fleurs-de-lis (heraldry secondary). */
  lily: { color: LILY_GOLD } as Material,
  /** Dark outline under the lily, so it reads on a yellow team field. */
  lilyEdge: { color: 0x2a2218 } as Material,
  /** Dark navy wool hose: well apart from any team blue. */
  navy: { color: ROYAL_NAVY } as Material,
  /** Undyed Gaulish wool, checked trousers (braccae). */
  braccae: { color: 0x8a7a5a, bands: { count: 5, color: 0x6a5a40, width: 0.18 } } as Material,
  /** Bourbon white: cockades, breeches, the bicorne's edging. */
  white: { color: 0xf0ece0 } as Material,
  /** Black felt of the bicorne. */
  felt: { color: 0x1d1c22 } as Material,
  /** Lime-washed oak boards of the Gaulish shield's back, and its spine. */
  board: { color: 0xb59a6c } as Material,
  /** Black horsehair mane (crinière) of the cuirassier's helm. */
  horsehair: { color: 0x17130f } as Material,
  /** Bronze of the Gaulish helm and its wheel crest. */
  bronze: { color: 0xc59b52, metal: 0.85 } as Material,
  /** Pale gilt bronze gun (the Hungarian gun is a darker bronze, the English iron, the German blackened iron). */
  barrel: { color: 0xc9a65a, metal: 0.9, bands: { count: 3, color: 0x8a6a2c, width: 0.12 } } as Material,
  /** Casaque of the King's Musketeers (M8): team cloth bearing a white cross (no field: the cloth shows round it). */
  casaque: { color: 0xffffff, team: true, charge: { cross: 0xf4f1e8, front: 0.1, panel: 0.7, bar: 0.22, armAt: 0.6, arm: 0.1 } } as Material,
  /** Buff leather of the bandolier. */
  buff: { color: 0x9a7448 } as Material,
  /** Light chestnut of the cuirassiers' horses. */
  chestnut: { color: 0x9a5a2e } as Material,
} as const;
