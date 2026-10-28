import type { WindowLook } from '../../isoProps';
import type { ArchStyle } from '../style';

/*
 * The Spanish age styles (M5, CLAUDE.md §4.2 "Mediterrán, fehér vakolat,
 * cserép tető"): blocks round patios (kits/patio.ts) in every age.
 * - Age 1 is the bespoke Hispania family: whitewashed flat-roofed
 *   courtyard houses with parapets and low terracotta on the halls; the
 *   town centre is a forum behind a two-tier granite aqueduct and the
 *   tower the Roman lighthouse of A Coruña.
 * - Age 2 is the bespoke Mudéjar family on the same layouts: Toledan
 *   brick, horseshoe arches in alfiz frames, glazed tile bands, stepped
 *   merlons and square brick towers; the town centre is a Castilian keep
 *   (torre del homenaje) with bartizans.
 * - Age 3 rides the Mudéjar layouts in the Colonial style: whitewash,
 *   ochre plateresque portals, low terracotta hips, espadaña bell gables
 *   and iron balconies; the town centre is a bell-gabled cabildo and the
 *   Wonder the Alhambra.
 */

const TERRACOTTA = 0xb4552f;

/** Small lamplit lights in dark chestnut frames (age 1). */
const LAMP_WINDOW: WindowLook = { frame: 0x3b2a1e, glassTop: 0xffd88a, glassBottom: 0xc7772f, bars: 0x3b2a1e };

/** Age 1 (Római kor): Hispania — whitewash over granite, flat terraces with parapets, low terracotta halls, the aqueduct forum. */
export const SPANISH_HISPANIA: ArchStyle = {
  id: 'hispania',
  family: 'hispania',
  palette: {
    stone: 0x9d978b,
    ashlar: 0xbdb3a0,
    plaster: 0xf2eee4,
    // Red-ochre (almagra) plinths under the whitewash.
    plasterDeep: 0xa9543a,
    timber: 0x6a4a30,
    darkWood: 0x4f3826,
    board: 0x7a5a3c,
    brick: 0xb3653f,
    rawBrick: 0xb3653f,
    stack: 0xe6e0d4,
    planks: 0x7a5a3c,
    doors: { main: 0x5a3a22, gate: 0x4d321e, work: 0x47301f },
    roof: TERRACOTTA,
    roofAlt: 0xa64c2b,
    thatch: 0xc8a25c,
    trim: 0xd9ccae,
    metal: 0x2b2725,
    shutter: 0x4b6b45,
    window: LAMP_WINDOW,
    roofs: {},
  },
  roof: { pitch: 0.62, eave: 1, form: 'native', material: 'tile' },
  ornaments: { chimneys: true, halfTimber: false, quoins: false, pilasters: false, dormers: false, boardedGables: false },
  charge: 'castle',
  seedSalt: 45053,
  headroom: 0,
  kits: { courtyard: { walls: 'whitewash', portal: 'voussoir', tileBands: false, merlons: false, towers: 'none', espadanas: false, civic: 'keep', balconies: false, water: 'impluvium', field: 'olives' } },
};

/** Horseshoe lights with dark cedar frames (age 2). */
const MUDEJAR_WINDOW: WindowLook = { frame: 0x2e2118, glassTop: 0xffd690, glassBottom: 0xc0702c, bars: 0x2e2118, arch: 'horseshoe' };

/** Age 2 (Középkor): Mudéjar — Toledan brick, horseshoe arches in alfiz frames, glazed tile bands, stepped merlons, square towers. */
export const SPANISH_MUDEJAR: ArchStyle = {
  id: 'mudejar',
  family: 'mudejar',
  palette: {
    stone: 0xb0a184,
    ashlar: 0xcbb995,
    plaster: 0xe9ddc5,
    plasterDeep: 0x9a4a32,
    timber: 0x5a3e28,
    darkWood: 0x4a3322,
    board: 0x6c4e33,
    brick: 0xb5683f,
    rawBrick: 0xb5683f,
    stack: 0xb5683f,
    planks: 0x6c4e33,
    doors: { main: 0x4a2f1c, gate: 0x45301e, work: 0x3f2a1a },
    roof: 0xa9502e,
    roofAlt: 0x9b4a2b,
    thatch: 0xc8a25c,
    trim: 0xdcc8a0,
    metal: 0x2b2725,
    shutter: 0x2f6b55,
    window: MUDEJAR_WINDOW,
    roofs: {},
  },
  roof: { pitch: 0.7, eave: 1, form: 'native', material: 'tile' },
  ornaments: { chimneys: true, halfTimber: false, quoins: false, pilasters: false, dormers: false, boardedGables: false },
  charge: 'castle',
  seedSalt: 49157,
  headroom: 0,
  kits: { courtyard: { walls: 'toledan', portal: 'alfiz', tileBands: true, merlons: true, towers: 'brick', espadanas: false, civic: 'keep', balconies: false, water: 'well', field: 'huerta' } },
};

/** Tall casements behind green shutters and iron grilles (age 3). */
const REJA_WINDOW: WindowLook = { frame: 0x2a2523, glassTop: 0xffdc96, glassBottom: 0xc47a33, bars: 0x1f1b1a };

/** Age 3 (Felvilágosodás): Colonial — whitewash, ochre plateresque portals, low terracotta hips, espadañas, iron balconies. */
export const SPANISH_COLONIAL: ArchStyle = {
  id: 'colonial',
  family: 'mudejar',
  palette: {
    stone: 0xb7a98c,
    ashlar: 0xd7b77a,
    plaster: 0xf6f2ea,
    // Ochre plinths and the plateresque stone.
    plasterDeep: 0xd39a45,
    timber: 0x5b3f29,
    darkWood: 0x4b3424,
    board: 0x6d4f35,
    brick: 0xb8693f,
    rawBrick: 0xc08a62,
    stack: 0xf0ebe0,
    planks: 0x6d4f35,
    doors: { main: 0x5a3720, gate: 0x4e321e, work: 0x47301f },
    roof: 0xbb5a32,
    roofAlt: 0xae5130,
    thatch: 0xc8a25c,
    trim: 0xd9a656,
    metal: 0x221e1d,
    shutter: 0x2f5d48,
    window: REJA_WINDOW,
    roofs: {},
  },
  roof: { pitch: 0.55, eave: 1, form: 'hip', material: 'tile' },
  ornaments: { chimneys: true, halfTimber: false, quoins: true, pilasters: true, dormers: false, boardedGables: false },
  charge: 'castle',
  seedSalt: 53249,
  headroom: 0,
  kits: { courtyard: { walls: 'whitewash', portal: 'plateresque', tileBands: false, merlons: false, towers: 'mirador', espadanas: true, civic: 'cabildo', balconies: true, water: 'fountain', field: 'vines' } },
};
