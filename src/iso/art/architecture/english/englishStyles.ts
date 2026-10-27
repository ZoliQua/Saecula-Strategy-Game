import type { WindowLook } from '../../isoProps';
import type { ArchStyle, Ornaments } from '../style';

/*
 * The English age styles (M4 design decision 4, CLAUDE.md §4.2 "Tudor,
 * szürke kő, meredek tetők"): cooler and greyer than the Hungarian
 * sets, with steeper roofs. Their own families (romanoBritish.ts,
 * tudor.ts) paint the bespoke silhouettes; the palette and roof profile
 * also drive the shared tower painters until Task 4 replaces them.
 */

const ENGLISH_ORNAMENTS: Ornaments = { chimneys: true, halfTimber: true, quoins: true, pilasters: false, dormers: true, boardedGables: false };

/** Small greenish crown glass behind lead cames; warm firelight at night. */
const LEADED_WINDOW: WindowLook = { frame: 0x211b16, glassTop: 0xffe39a, glassBottom: 0xcf8a3c, bars: 0x2a2420 };

/** Age 1 (Római kor): Romano-British — grey rubble, limewashed daub, weathered reed thatch, slate. */
export const ENGLISH_ROMANO_BRITISH: ArchStyle = {
  id: 'romano_british',
  family: 'romano_british',
  palette: {
    stone: 0x8a8c88,
    ashlar: 0xaeaca2,
    plaster: 0xd8d4c6,
    plasterDeep: 0xb7a98c,
    timber: 0x5b4836,
    darkWood: 0x473829,
    board: 0x6a5642,
    brick: 0x8a8c88,
    rawBrick: 0x8a8c88,
    stack: 0x7d7f7b,
    planks: 0x6a5642,
    doors: { main: 0x4a3624, gate: 0x3e2e20, work: 0x3a2a1c },
    roof: 0x56606b,
    roofAlt: 0x646a70,
    thatch: 0x8d7a50,
    trim: 0xcfcabb,
    metal: 0x6f7a72,
    shutter: 0x4c5d6a,
    window: LEADED_WINDOW,
    roofs: {},
  },
  roof: { pitch: 1.35, eave: 1, form: 'native' },
  ornaments: ENGLISH_ORNAMENTS,
  charge: 'st_george',
  seedSalt: 4099,
  headroom: 30,
};

/** Age 2 (Középkor): Tudor / Norman — black-and-white framing over grey stone, red-brown peg tile, brick stacks. */
export const ENGLISH_TUDOR: ArchStyle = {
  id: 'tudor',
  family: 'tudor',
  palette: {
    stone: 0x8e8b84,
    ashlar: 0xaca89d,
    plaster: 0xf1ede2,
    plasterDeep: 0xe2d9c6,
    timber: 0x2b2420,
    darkWood: 0x3a2e25,
    board: 0x3a2e25,
    brick: 0x9c5038,
    rawBrick: 0xa0583c,
    stack: 0x94472f,
    planks: 0x4a382a,
    doors: { main: 0x3a2416, gate: 0x33231a, work: 0x2e2018 },
    roof: 0x83432f,
    roofAlt: 0x5a5d62,
    thatch: 0xa58c55,
    trim: 0xe8e2d2,
    metal: 0x5a6066,
    shutter: 0x2b2420,
    window: LEADED_WINDOW,
    roofs: {},
  },
  roof: { pitch: 1.45, eave: 1, form: 'native' },
  ornaments: ENGLISH_ORNAMENTS,
  charge: 'st_george',
  seedSalt: 8191,
  headroom: 50,
};
