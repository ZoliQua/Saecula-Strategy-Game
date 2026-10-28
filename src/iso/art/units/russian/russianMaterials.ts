import type { Material } from '../materials';

/**
 * Russian unit palette (M5, CLAUDE.md §4.2): white, blue and red — the
 * registry heraldry (config/civs.ts russian: primary white, secondary
 * blue, accent red) — kept off the team-coloured cloth so a blue or a
 * red team still reads as the owner: the blue and white only in the
 * small St Andrew's saltire badge, outlined dark; the red as a
 * darkened crimson rim round the teardrop shield's team field; the
 * legs in near-black blue-grey wool, the kolpak trimmed in dark fur.
 */
export const RUSSIAN_M = {
  /** St Andrew's saltire: the blue cross on a white badge (heraldry secondary, primary). */
  saltireBlue: { color: 0x1f4fa0 } as Material,
  saltireWhite: { color: 0xf2efe6 } as Material,
  /** Dark outline round the badge, so it stays apart from a blue, white or red team field. */
  saltireEdge: { color: 0x1a1820 } as Material,
  /** Crimson rim of the teardrop shield, darkened well past any team red. */
  crimson: { color: 0x5c1418 } as Material,
  /** Near-black blue-grey wool trousers: well apart from any team blue. */
  wool: { color: 0x232630 } as Material,
  /** Dark sable fur of the kolpak's trim and the cavalry's cap. */
  fur: { color: 0x3e2c20 } as Material,
  /** Ash-wood haft of the berdysh. */
  haft: { color: 0x7a5a36 } as Material,
  /** Dark-patinated bronze gun with gilt rings (the Hungarian gun is a yellow bronze, the Italian ruddy, the Spanish verdigris). */
  barrel: { color: 0x5a4630, metal: 0.7, bands: { count: 3, color: 0xc89a3c, width: 0.12 } } as Material,
  /** Dun steppe horses of the druzhina and the dragoons. */
  dun: { color: 0xa88a5c } as Material,
} as const;
