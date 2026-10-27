import type { AgeId, CivId } from '../types';

/**
 * Civ registry (CLAUDE.md §4.2, M4 design decision 1): which civs can be
 * played and which art each one shows. Civs differ only visually
 * (§4.3). The ids name painter sets in src/iso/art; a civ without its
 * own art yet points at the Hungarian sets.
 */

/** Building painter set of one age style (art/buildings.ts). */
export type ArchStyleId = 'roman' | 'medieval' | 'baroque' | 'romano_british' | 'tudor' | 'georgian';
/** Wall painter style (art/walls/wallStyles.ts). */
export type WallStyleId = 'palisade' | 'curtain' | 'bastion' | 'bank_palisade' | 'norman_curtain' | 'star_fort';
/** Unit palette / heraldry look (art/units). */
export type UnitLookId = 'hungarian' | 'english';

/** Heraldic colours (banners, shields, liveries), 0xRRGGBB. */
export interface Heraldry {
  readonly primary: number;
  readonly secondary: number;
  readonly accent: number;
}

export interface CivDef {
  /** Playable now; the setup card shows the rest as "coming soon". */
  readonly available: boolean;
  readonly architecture: Readonly<Record<AgeId, ArchStyleId>>;
  readonly wallStyle: Readonly<Record<AgeId, WallStyleId>>;
  readonly unitLook: UnitLookId;
  readonly heraldry: Heraldry;
}

export const CIV_IDS: readonly CivId[] = [
  'hungarian',
  'english',
  'german',
  'french',
  'spanish',
  'italian',
  'russian',
  'finnish',
];

/** Fallback civ: setup default and any missing civ lookup. */
export const DEFAULT_CIV: CivId = 'hungarian';
/** Civ of the main-menu diorama's front quarter (the other playable civ gets the back one) and of the art painted at boot (generateArt, PreloadScene). */
export const MENU_CIV: CivId = 'hungarian';

const HUNGARIAN_ARCH: Record<AgeId, ArchStyleId> = { 1: 'roman', 2: 'medieval', 3: 'baroque' };
const HUNGARIAN_WALLS: Record<AgeId, WallStyleId> = { 1: 'palisade', 2: 'curtain', 3: 'bastion' };

/** A civ that is not drawn yet: Hungarian art, unavailable in setup. */
function upcoming(heraldry: Heraldry): CivDef {
  return { available: false, architecture: HUNGARIAN_ARCH, wallStyle: HUNGARIAN_WALLS, unitLook: 'hungarian', heraldry };
}

export const CIV_DEFS: Readonly<Record<CivId, CivDef>> = {
  // Árpád stripes: red, white, green.
  hungarian: {
    available: true,
    architecture: HUNGARIAN_ARCH,
    wallStyle: HUNGARIAN_WALLS,
    unitLook: 'hungarian',
    heraldry: { primary: 0xc8202e, secondary: 0xf2efe6, accent: 0x2e7d3a },
  },
  // St George's cross: white field, red cross. Romano-British, Tudor and Georgian buildings, walls and towers; English unit liveries.
  english: {
    available: true,
    architecture: { 1: 'romano_british', 2: 'tudor', 3: 'georgian' },
    wallStyle: { 1: 'bank_palisade', 2: 'norman_curtain', 3: 'star_fort' },
    unitLook: 'english',
    heraldry: { primary: 0xf2efe6, secondary: 0xc8202e, accent: 0x1f2f5a },
  },
  german: upcoming({ primary: 0x1a1a1a, secondary: 0xd4a017, accent: 0xb3202a }),
  french: upcoming({ primary: 0x1f3c88, secondary: 0xe8c547, accent: 0xf2efe6 }),
  spanish: upcoming({ primary: 0xc0262d, secondary: 0xf1bf00, accent: 0x7a1f1f }),
  italian: upcoming({ primary: 0x2e7d3a, secondary: 0xf2efe6, accent: 0xc8202e }),
  russian: upcoming({ primary: 0xf2efe6, secondary: 0x1f4fa0, accent: 0xc8202e }),
  finnish: upcoming({ primary: 0xf2efe6, secondary: 0x1f4f9a, accent: 0x7d8a96 }),
};

/** Civs a player can pick today (registry order). */
export const AVAILABLE_CIVS: readonly CivId[] = CIV_IDS.filter((id) => CIV_DEFS[id].available);
