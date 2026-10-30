import type { Material } from '../materials';

/**
 * Spanish unit palette (M5, CLAUDE.md §4.2): red, gold and dark red —
 * the registry heraldry (config/civs.ts spanish: primary red, secondary
 * gold, accent dark red) — kept off the team-coloured cloth so a red
 * team still reads as the owner: the reds only as a near-black wine on
 * hose and as a small horsehair crest, gold on the castle of Castile,
 * the hat bands and the lace; white linen and black felt elsewhere.
 */
const CASTILE_GOLD = 0xf1bf00;

export const SPANISH_M = {
  /** Gold of the castle of Castile (heraldry secondary). */
  castle: { color: CASTILE_GOLD, metal: 0.3 } as Material,
  /** Dark outline under the castle, so it reads on a red or yellow team field. */
  castleEdge: { color: 0x2a1a12 } as Material,
  /** Gate and windows of the castle. */
  castleGate: { color: 0x1c1a28 } as Material,
  /** Near-black wine-red wool hose (the accent darkened well past any team red). */
  wine: { color: 0x40181a } as Material,
  /** Undyed Iberian wool, a dark red stripe at the hem. */
  wool: { color: 0xd9cfb8, bands: { count: 3, color: 0x5a2020, width: 0.12 } } as Material,
  /** Black felt of the chambergo, black leather of the adarga's edge. */
  felt: { color: 0x1e1b1d } as Material,
  /** Hardened leather of the adarga's rim and back. */
  hide: { color: 0x7a5434 } as Material,
  /** Bronze of the Iberian helm and the caetra's boss. */
  bronze: { color: 0xc49a55, metal: 0.85 } as Material,
  /** Dark red horsehair crest of the Iberian helm. */
  horsehair: { color: 0x5e1a16 } as Material,
  /** Cream ostrich plume of the chambergo. */
  plume: { color: 0xf1ebdc } as Material,
  /** Verdigris-patinated bronze gun (the Hungarian gun is a brighter bronze, the French gilt, the English and German iron). */
  barrel: { color: 0x6f6c4c, metal: 0.6, bands: { count: 3, color: 0x3c3a26, width: 0.14 } } as Material,
  /** Gilt etching of the conquistador's morion (M8). */
  gilt: { color: 0xd8a83a, metal: 0.7 } as Material,
  /** Red feathers of the conquistador's plume (the accent, darkened off any team red). */
  plumeRed: { color: 0x8a1c1c } as Material,
  /** Bright polished breastplate of the conquistador. */
  cuirass: { color: 0xc4c8cc, metal: 0.9 } as Material,
  /** Buff leather of the conquistador's riding boots. */
  buffBoot: { color: 0x8a6440 } as Material,
  /** Dark bay horse of the conquistador. */
  bay: { color: 0x5a3622 } as Material,
  /** Andalusian grey horse of the jinetes and dragoons. */
  dapple: { color: 0xb7aea2 } as Material,
} as const;
