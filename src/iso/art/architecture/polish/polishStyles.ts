import type { WindowLook } from '../../isoProps';
import type { ArchStyle } from '../style';

/*
 * The Polish age styles (M21, CLAUDE.md §4.2 "Téglagótika, attikás
 * reneszánsz").
 * - Age 1 (biskupin): the Biskupin stilt settlement — long terraced
 *   timber row houses under reed thatch on plank streets, behind a
 *   box rampart of earth-filled timber cribs with a gate tower.
 * - Age 2 (krakow_gothic): Kraków brick Gothic — red brick with white
 *   stone trim under steep plain-tile roofs, no stepped gables; the town
 *   centre is St Mary's with its two uneven towers, the taller one under
 *   a crowned spire helm.
 * - Age 3 (polish_attic): Polish Renaissance — every main roof hidden
 *   behind a crested attic parapet (RoofProfile.form 'attic'),
 *   colourful arcaded Zamość houses, a Zamość town hall; the Wonder is
 *   Wawel hill.
 */

/** Small lights in dark oak frames (age 1). */
const OAK_WINDOW: WindowLook = { frame: 0x3a2a1c, glassTop: 0xffd88a, glassBottom: 0xc7772f, bars: 0x3a2a1c };
/** Leaded lancets in white stone surrounds (age 2). */
const GOTHIC_WINDOW: WindowLook = { frame: 0xe8e1d0, glassTop: 0xffd27a, glassBottom: 0xb8692a, bars: 0x4a3a2a, arch: 'pointed' };
/** White-framed casements (age 3). */
const ATTIC_WINDOW: WindowLook = { frame: 0xf4efe3, glassTop: 0xffdc96, glassBottom: 0xc47a33, bars: 0xe9e2d4 };

/** Age 1 (Római kor): biskupin — oak cribs, plank walls, reed thatch, earth. */
export const POLISH_BISKUPIN: ArchStyle = {
  id: 'biskupin',
  family: 'biskupin',
  palette: {
    // Packed earth and clay of the rampart fill.
    stone: 0x7c6a52,
    ashlar: 0x9a8a6e,
    // Clay-daubed plank walls.
    plaster: 0xa08562,
    plasterDeep: 0x86704f,
    timber: 0x5c4630,
    // Split oak of walls and cribs.
    darkWood: 0x6a5238,
    board: 0x8a7050,
    brick: 0x8f5a3e,
    rawBrick: 0x8f5a3e,
    stack: 0x7d7064,
    planks: 0x7a6146,
    doors: { main: 0x45321f, gate: 0x3e2c1b, work: 0x3e2c1b },
    // Reed thatch, weathered grey-gold.
    roof: 0xa8945e,
    roofAlt: 0x8e7c50,
    thatch: 0xa8945e,
    trim: 0xd8c9a4,
    metal: 0x7d8288,
    shutter: 0x45321f,
    window: OAK_WINDOW,
    roofs: {},
  },
  roof: { pitch: 1, eave: 1, form: 'native', material: 'thatch' },
  ornaments: { chimneys: false, halfTimber: false, quoins: false, pilasters: false, dormers: false, boardedGables: false },
  charge: 'white_eagle',
  seedSalt: 94209,
  dropHiddenGlows: true,
  headroom: 0,
};

/** Age 2 (Középkor): krakow_gothic — red brick, white stone trim, steep plain tile. */
export const POLISH_KRAKOW: ArchStyle = {
  id: 'krakow_gothic',
  family: 'krakow',
  palette: {
    // Brick plinths and towers.
    stone: 0x8e3c2a,
    // White limestone dressings.
    ashlar: 0xe4dccb,
    // Brick walls of halls and houses.
    plaster: 0xae4a32,
    plasterDeep: 0x8a3726,
    timber: 0x4a3220,
    darkWood: 0x5a3a22,
    board: 0x7a4a2a,
    brick: 0xae4a32,
    rawBrick: 0xa8603f,
    stack: 0x8e3c2a,
    planks: 0x6e4528,
    doors: { main: 0x4a2e18, gate: 0x3e2614, work: 0x3e2614 },
    // Steep plain tiles, a darker red-brown than the brick.
    roof: 0x7e3424,
    roofAlt: 0x6a5a4c,
    thatch: 0xb08d4e,
    trim: 0xece5d6,
    // Verdigris helms of St Mary's.
    metal: 0x5f9e88,
    shutter: 0x4a2e18,
    window: GOTHIC_WINDOW,
    roofs: {},
  },
  roof: { pitch: 1.4, eave: 1, form: 'native', material: 'tile' },
  ornaments: { chimneys: true, halfTimber: false, quoins: false, pilasters: false, dormers: false, boardedGables: false },
  charge: 'white_eagle',
  seedSalt: 98317,
  dropHiddenGlows: true,
  headroom: 44,
};

/** Age 3 (Felvilágosodás): polish_attic — apricot render, white crested attics, hidden roofs. */
export const POLISH_ATTIC: ArchStyle = {
  id: 'polish_attic',
  family: 'zamosc',
  palette: {
    stone: 0xb3a68e,
    ashlar: 0xcdbfa3,
    // Apricot render of the Zamość houses.
    plaster: 0xe3a46c,
    plasterDeep: 0xc9874e,
    timber: 0x5a3b20,
    darkWood: 0x6e4528,
    board: 0x8c3d26,
    brick: 0x9c4a32,
    rawBrick: 0xa8603f,
    stack: 0x9a4a32,
    planks: 0x6e4528,
    doors: { main: 0x5a3518, gate: 0x4a2e18, work: 0x3e2614 },
    // The low tiled roofs hidden inside the attics (every roof, slate ones too).
    roof: 0x9a4a32,
    roofAlt: 0x8e4630,
    thatch: 0xb08d4e,
    // White attic crests, cornices and window surrounds.
    trim: 0xf4eee0,
    metal: 0x5f9e88,
    shutter: 0x3f5a3a,
    window: ATTIC_WINDOW,
    roofs: {},
  },
  roof: { pitch: 0.42, eave: 1, form: 'attic', material: 'tile' },
  ornaments: { chimneys: true, halfTimber: false, quoins: true, pilasters: true, dormers: false, boardedGables: false },
  charge: 'white_eagle',
  seedSalt: 102401,
  dropHiddenGlows: true,
  headroom: 0,
};
