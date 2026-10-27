import { WARM_WINDOW } from '../isoProps';
import type { ArchStyle, Ornaments, RoofProfile } from './style';

/*
 * The Hungarian age styles — the M3 art, value for value (the
 * hungarianArt.test.ts hashes pin it). Unused slots carry neutral values.
 */

const NATIVE_ROOF: RoofProfile = { pitch: 1, eave: 1, form: 'native' };
const ALL_ORNAMENTS: Ornaments = { chimneys: true, halfTimber: true, quoins: true, pilasters: true, dormers: true, boardedGables: true };

/** White trim of every Hungarian age (mouldings, pilasters, cornices). */
const WHITE_TRIM = 0xf3ecdc;
const DOORS = { main: 0x5a3518, gate: 0x4a2e18, work: 0x3e2614 } as const;
const VERDIGRIS = 0x5f9e88;
const GREEN_SHUTTER = 0x3f5a3a;

/** Age 1 (Római kor): whitewashed plaster, terracotta, timber, travertine. */
export const HUNGARIAN_ROMAN: ArchStyle = {
  id: 'roman',
  family: 'roman',
  palette: {
    stone: 0xa49a88,
    ashlar: 0xc9bea6,
    plaster: 0xe8d6ad,
    plasterDeep: 0xe8d6ad,
    timber: 0x8a5a32,
    darkWood: 0x5e3b20,
    board: 0x7a4a2a,
    brick: 0x8d8170,
    rawBrick: 0x8d8170,
    stack: 0x8d8170,
    planks: 0x7a4a2a,
    doors: DOORS,
    roof: 0xb4532f,
    roofAlt: 0x5d5a55,
    thatch: 0xc49a4a,
    trim: WHITE_TRIM,
    metal: VERDIGRIS,
    shutter: GREEN_SHUTTER,
    window: WARM_WINDOW,
    roofs: {
      lumber_camp: 0x6b4a2a,
      mining_camp: 0x5d5a55,
      barracks: 0x9c3b28,
      archery_range: 0x2f4f7a,
      stable: 0xc49a4a,
      blacksmith: 0x4d4842,
    },
  },
  roof: NATIVE_ROOF,
  ornaments: ALL_ORNAMENTS,
  charge: 'double_cross',
  seedSalt: 0,
  headroom: 0,
};

/** Age 2 (Középkor): fieldstone, oak framing, whitewash, shingle, reed thatch. */
export const HUNGARIAN_MEDIEVAL: ArchStyle = {
  id: 'medieval',
  family: 'medieval',
  palette: {
    stone: 0x9c9282,
    ashlar: 0xb9b09e,
    plaster: 0xebe2cd,
    plasterDeep: 0xebe2cd,
    timber: 0x4a3220,
    darkWood: 0x5a3a22,
    board: 0x8a6a44,
    brick: 0x8d8170,
    rawBrick: 0x8d8170,
    stack: 0x8d8170,
    planks: 0x6e4528,
    doors: DOORS,
    roof: 0x6f5c4a,
    roofAlt: 0x6f5c4a,
    thatch: 0xb08d4e,
    trim: WHITE_TRIM,
    metal: VERDIGRIS,
    shutter: GREEN_SHUTTER,
    window: WARM_WINDOW,
    roofs: {},
  },
  roof: NATIVE_ROOF,
  ornaments: ALL_ORNAMENTS,
  charge: 'double_cross',
  seedSalt: 0,
  headroom: 0,
};

/** Age 3 (Felvilágosodás): Maria Theresa yellow, white trim, red tile, slate, verdigris. */
export const HUNGARIAN_BAROQUE: ArchStyle = {
  id: 'baroque',
  family: 'baroque',
  palette: {
    stone: 0xb7ab94,
    ashlar: 0xb7ab94,
    plaster: 0xe3b85e,
    plasterDeep: 0xc9953f,
    timber: 0x5a3b20,
    darkWood: 0x6e4528,
    board: 0x8c3d26,
    brick: 0x9c4a32,
    rawBrick: 0xa8603f,
    stack: 0x9a4a32,
    planks: 0x6e4528,
    doors: DOORS,
    roof: 0xa3472c,
    roofAlt: 0x56606b,
    thatch: 0xb08d4e,
    trim: WHITE_TRIM,
    metal: VERDIGRIS,
    shutter: GREEN_SHUTTER,
    window: WARM_WINDOW,
    roofs: {},
  },
  roof: NATIVE_ROOF,
  ornaments: ALL_ORNAMENTS,
  charge: 'double_cross',
  seedSalt: 0,
  headroom: 0,
};
