import type { AgeId, CivId } from '../types';

/**
 * Civ registry (CLAUDE.md §4.2, M4 design decision 1): which civs can be
 * played and which art each one shows. Civs differ only visually
 * (§4.3). The ids name painter sets in src/iso/art; since M5 every civ
 * has its own.
 */

/** Building painter set of one age style (art/buildings.ts). */
export type ArchStyleId =
  | 'roman'
  | 'medieval'
  | 'baroque'
  | 'romano_british'
  | 'tudor'
  | 'georgian'
  | 'limes'
  | 'fachwerk'
  | 'backstein'
  | 'gallo_roman'
  | 'gothic_fr'
  | 'classicisme'
  | 'hispania'
  | 'mudejar'
  | 'colonial'
  | 'etruria'
  | 'comune'
  | 'rinascimento'
  | 'rus_gord'
  | 'muscovy'
  | 'petrine'
  | 'finnic'
  | 'greystone'
  | 'gustavian';
/** Wall painter style (art/walls/wallStyles.ts). */
export type WallStyleId =
  | 'palisade'
  | 'curtain'
  | 'bastion'
  | 'bank_palisade'
  | 'norman_curtain'
  | 'star_fort'
  | 'limes_palisade'
  | 'backstein_curtain'
  | 'sandstone_fort'
  | 'murus_gallicus'
  | 'pepperpot_curtain'
  | 'vauban'
  | 'celtiberian'
  | 'tapial'
  | 'garita_bastion'
  | 'servian'
  | 'ghibelline'
  | 'trace_italienne'
  | 'rus_palisade'
  | 'gorodnya'
  | 'kremlin'
  | 'hillfort'
  | 'granite_curtain'
  | 'granite_bastion';
/** Unit palette / heraldry look (art/units). */
export type UnitLookId = 'hungarian' | 'english' | 'german' | 'french' | 'spanish' | 'italian' | 'russian' | 'finnish';

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
/** Civ of the main-menu diorama's front quarter (menuDioramaCivs picks the back one) and of the art painted at boot (generateArt, PreloadScene). */
export const MENU_CIV: CivId = 'hungarian';

const HUNGARIAN_ARCH: Record<AgeId, ArchStyleId> = { 1: 'roman', 2: 'medieval', 3: 'baroque' };
const HUNGARIAN_WALLS: Record<AgeId, WallStyleId> = { 1: 'palisade', 2: 'curtain', 3: 'bastion' };

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
  // Black eagle on gold, red. Limes / Fachwerk / Backstein buildings; Limes palisade, Backstein curtain and red sandstone star fort; German unit liveries.
  german: {
    available: true,
    architecture: { 1: 'limes', 2: 'fachwerk', 3: 'backstein' },
    wallStyle: { 1: 'limes_palisade', 2: 'backstein_curtain', 3: 'sandstone_fort' },
    unitLook: 'german',
    heraldry: { primary: 0x1a1a1a, secondary: 0xd4a017, accent: 0xb3202a },
  },
  // Gold fleurs-de-lis on royal blue. Gallo-Roman / Loire Gothic / Classicisme buildings; murus gallicus, pepperpot-towered curtain and Vauban trace; French unit liveries.
  french: {
    available: true,
    architecture: { 1: 'gallo_roman', 2: 'gothic_fr', 3: 'classicisme' },
    wallStyle: { 1: 'murus_gallicus', 2: 'pepperpot_curtain', 3: 'vauban' },
    unitLook: 'french',
    heraldry: { primary: 0x1f3c88, secondary: 0xe8c547, accent: 0xf2efe6 },
  },
  // Castile and León: gold castle on red. Hispania / Mudéjar / Colonial buildings; Celtiberian dry stone, tapial with stepped merlons and a whitewashed garita bastion; Spanish unit liveries.
  spanish: {
    available: true,
    architecture: { 1: 'hispania', 2: 'mudejar', 3: 'colonial' },
    wallStyle: { 1: 'celtiberian', 2: 'tapial', 3: 'garita_bastion' },
    unitLook: 'spanish',
    heraldry: { primary: 0xc0262d, secondary: 0xf1bf00, accent: 0x7a1f1f },
  },
  // Tricolour: green, white, red. Etruria / Comune / Rinascimento buildings; Servian tufa wall, Ghibelline brick curtain and brick trace italienne; Italian unit liveries.
  italian: {
    available: true,
    architecture: { 1: 'etruria', 2: 'comune', 3: 'rinascimento' },
    wallStyle: { 1: 'servian', 2: 'ghibelline', 3: 'trace_italienne' },
    unitLook: 'italian',
    heraldry: { primary: 0x2e7d3a, secondary: 0xf2efe6, accent: 0xc8202e },
  },
  // St Andrew's saltire: white, blue, red. Log gorod / Muscovite / Petrine buildings; log wall on a rampart, gorodnya cribs with tented log towers and a whitewashed kremlin; Russian unit liveries.
  russian: {
    available: true,
    architecture: { 1: 'rus_gord', 2: 'muscovy', 3: 'petrine' },
    wallStyle: { 1: 'rus_palisade', 2: 'gorodnya', 3: 'kremlin' },
    unitLook: 'russian',
    heraldry: { primary: 0xf2efe6, secondary: 0x1f4fa0, accent: 0xc8202e },
  },
  // Nordic cross: white, blue, grey. Turf homestead / greystone / Gustavian buildings; granite hill fort, boulder curtain with shingle-coned round towers and a turf-topped granite bastion trace; Finnish unit liveries.
  finnish: {
    available: true,
    architecture: { 1: 'finnic', 2: 'greystone', 3: 'gustavian' },
    wallStyle: { 1: 'hillfort', 2: 'granite_curtain', 3: 'granite_bastion' },
    unitLook: 'finnish',
    heraldry: { primary: 0xf2efe6, secondary: 0x1f4f9a, accent: 0x7d8a96 },
  },
};

/**
 * Dev builds with `?civs=all` in the URL: every civ is playable, the
 * unavailable ones under their own `~c<civ>` keys with whatever art they
 * have so far (Hungarian sets where none is drawn yet): N-civ memory /
 * load measurements, UI shots and in-game art review before a civ is done. Always false in production and in tests (no `location`).
 */
export const DEV_ALL_CIVS: boolean =
  import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).get('civs') === 'all';

/** Civs a player can pick today (registry order). */
export const AVAILABLE_CIVS: readonly CivId[] = DEV_ALL_CIVS ? CIV_IDS : CIV_IDS.filter((id) => CIV_DEFS[id].available);

/**
 * Civs of the main-menu diorama on its `visit`-th showing: MENU_CIV in
 * front, and behind it the visit-th civ of `pool` other than MENU_CIV,
 * cycling (each return to the menu shows the next civ). With no other
 * civ in the pool the back quarter takes the next civ in registry order,
 * so the two quarters always differ.
 */
export function menuDioramaCivs(visit: number, pool: readonly CivId[] = AVAILABLE_CIVS): [CivId, CivId] {
  const others = pool.filter((c) => c !== MENU_CIV);
  const from = others.length > 0 ? others : CIV_IDS.filter((c) => c !== MENU_CIV);
  const i = ((Math.floor(visit) % from.length) + from.length) % from.length;
  return [MENU_CIV, from[i] ?? DEFAULT_CIV];
}
