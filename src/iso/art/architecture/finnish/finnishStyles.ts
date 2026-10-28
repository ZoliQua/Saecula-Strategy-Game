import type { WindowLook } from '../../isoProps';
import type { ArchStyle } from '../style';

/*
 * The Finnish age styles (M5, CLAUDE.md §4.2 "Északi fa, tőzeges tető,
 * zord"). All three ride the bespoke nordic family; its NordicKits pick
 * each age's layouts.
 * - Age 1 (finnic): low, wide grey log huts under thick rounded turf
 *   roofs, bark kotas and storehouses (aitta) on stilts; the town centre
 *   is a turf-roofed longhouse hall.
 * - Age 2 (greystone): red-ochre (punamulta) logs under shingle gables;
 *   the town centre is a grey granite castle hall beside a wooden bell
 *   tower (kellotapuli).
 * - Age 3 (gustavian): falu-red board houses with white corner boards
 *   under shingled gambrels; the town centre is a yellow-ochre manor
 *   between red wings. The Wonder is the Petäjävesi church.
 */

/** Small lights in plain dark frames (ages 1-2). */
const LOG_WINDOW: WindowLook = { frame: 0x33281d, glassTop: 0xffd88a, glassBottom: 0xc7772f, bars: 0x33281d };

/** Age 1 (Római kor): finnic — grey pine logs, turf roofs, birch bark. */
export const FINNISH_FINNIC: ArchStyle = {
  id: 'finnic',
  family: 'nordic',
  palette: {
    // Grey granite fieldstones.
    stone: 0x8b8984,
    ashlar: 0xa8a59e,
    plaster: 0xcfc4ab,
    plasterDeep: 0xa99878,
    timber: 0x5e5142,
    // Weathered grey pine logs.
    darkWood: 0x77695a,
    board: 0x9a8a72,
    brick: 0x8f5a3e,
    rawBrick: 0x8f5a3e,
    stack: 0x7d7a74,
    planks: 0x6e604f,
    doors: { main: 0x4a3c2c, gate: 0x433626, work: 0x403323 },
    // Summer turf.
    roof: 0x4e6c2c,
    // Spruce bark of kotas.
    roofAlt: 0x6e5a44,
    thatch: 0xa8935e,
    // Birch bark under the sods.
    trim: 0xe2dccb,
    metal: 0x7d8288,
    shutter: 0x4a3c2c,
    window: LOG_WINDOW,
    roofs: {},
  },
  roof: { pitch: 1, eave: 1, form: 'native', material: 'shingle' },
  ornaments: { chimneys: false, halfTimber: false, quoins: false, pilasters: false, dormers: false, boardedGables: false },
  charge: 'nordic_cross',
  seedSalt: 81921,
  headroom: 0,
  kits: { nordic: { walls: 'logs', roofs: 'turf', civic: 'longhouse', belfry: 'lookout', works: 'homestead' } },
};

/** Age 2 (Középkor): greystone — red-ochre logs, tarred shingles, grey granite. */
export const FINNISH_GREYSTONE: ArchStyle = {
  id: 'greystone',
  family: 'nordic',
  palette: {
    stone: 0x8e8c87,
    // Grey granite of the castle hall.
    ashlar: 0x9d9a94,
    plaster: 0xe6e0d2,
    plasterDeep: 0xc9c0ac,
    timber: 0x5a4332,
    // Punamulta: red-ochre painted logs.
    darkWood: 0x8e3d2a,
    board: 0x8a3a28,
    brick: 0x9a4a34,
    rawBrick: 0x9a4a34,
    stack: 0x8e8c87,
    planks: 0x6e5440,
    doors: { main: 0x3e2e22, gate: 0x3a2b20, work: 0x3a2b20 },
    // Tarred split shingles.
    roof: 0x5f5446,
    roofAlt: 0x6a5c4a,
    thatch: 0xa8935e,
    trim: 0xd9cfbb,
    metal: 0x7d8288,
    shutter: 0x3e2e22,
    window: LOG_WINDOW,
    roofs: {},
  },
  roof: { pitch: 1, eave: 1, form: 'native', material: 'shingle' },
  ornaments: { chimneys: true, halfTimber: false, quoins: false, pilasters: false, dormers: false, boardedGables: false },
  charge: 'nordic_cross',
  seedSalt: 86017,
  headroom: 0,
  kits: { nordic: { walls: 'logs', roofs: 'shingle', civic: 'castle', belfry: 'kellotapuli', works: 'village' } },
};

/** White-framed six-pane casements (age 3). */
const GUSTAVIAN_WINDOW: WindowLook = { frame: 0xf3efe6, glassTop: 0xffdc96, glassBottom: 0xc47a33, bars: 0xece6da };

/** Age 3 (Felvilágosodás): gustavian — falu-red boards, white corners, brown shingle gambrels, an ochre manor. */
export const FINNISH_GUSTAVIAN: ArchStyle = {
  id: 'gustavian',
  family: 'nordic',
  palette: {
    stone: 0x8e8c87,
    ashlar: 0xa3a09a,
    // Yellow-ochre render of the manor.
    plaster: 0xd9ae58,
    plasterDeep: 0xc39642,
    timber: 0x58412f,
    // Falu red board cladding.
    darkWood: 0x9b2f22,
    board: 0x9b2f22,
    brick: 0x9e4c36,
    rawBrick: 0xb08a6a,
    stack: 0xe9e4d8,
    planks: 0x6a503c,
    doors: { main: 0x2e4a5a, gate: 0x3a2b20, work: 0x3a2b20 },
    // Brown split shingles.
    roof: 0x5c4838,
    roofAlt: 0x4f3e31,
    thatch: 0xa8935e,
    // White corner boards, window frames and verges.
    trim: 0xf3efe6,
    metal: 0x6f7a80,
    shutter: 0x2e4a5a,
    window: GUSTAVIAN_WINDOW,
    roofs: {},
  },
  roof: { pitch: 1, eave: 1, form: 'native', material: 'shingle' },
  ornaments: { chimneys: true, halfTimber: false, quoins: false, pilasters: true, dormers: false, boardedGables: false },
  charge: 'nordic_cross',
  seedSalt: 90113,
  headroom: 0,
  kits: { nordic: { walls: 'boards', roofs: 'gambrel', civic: 'manor', belfry: 'lantern', works: 'bruk' } },
};
