import type { Material } from '../materials';

/**
 * Italian unit palette (M5, CLAUDE.md §4.2): green, white and red — the
 * registry heraldry (config/civs.ts italian: primary green, secondary
 * white, accent red) — kept off the team-coloured cloth so a green or a
 * red team still reads as the owner: the tricolour only as narrow
 * outlined pales on the knight's shield and the pavise, the green as a
 * near-black bottle green on hose and in the dark cock-feather plume,
 * white on the Samnite feathers and the musketeers' belts.
 */
export const ITALIAN_M = {
  /** The tricolour's pales (heraldry primary, secondary, accent). */
  paleGreen: { color: 0x2e7d3a } as Material,
  paleWhite: { color: 0xf2efe6 } as Material,
  paleRed: { color: 0xc8202e } as Material,
  /** Dark outline round the pales, so they stay apart from a green, white or red team field. */
  paleEdge: { color: 0x1e1a16 } as Material,
  /** Near-black bottle-green wool hose: well apart from any team green. */
  hose: { color: 0x1f2e24 } as Material,
  /** Bronze of the Samnite helm. */
  bronze: { color: 0xcaa35c, metal: 0.85 } as Material,
  /** White feathers of the Samnite helm. */
  feather: { color: 0xf4efe2 } as Material,
  /** Dark green-black cock feathers of the plumed hat. */
  plume: { color: 0x1c2620, metal: 0.25 } as Material,
  /** Black felt of the wide-brimmed hat. */
  felt: { color: 0x22201f } as Material,
  /** Poplar boards and the leather rim of the pavise. */
  board: { color: 0x6b4a2e } as Material,
  /** Ruddy Venetian gun-bronze (the Hungarian gun is a yellower bronze, the Spanish verdigris, the French gilt). */
  barrel: { color: 0xa8653a, metal: 0.8, bands: { count: 3, color: 0x5e3420, width: 0.13 } } as Material,
  /** Black (morello) horses of the condottieri and dragoons. */
  morello: { color: 0x2f2a28 } as Material,
} as const;
