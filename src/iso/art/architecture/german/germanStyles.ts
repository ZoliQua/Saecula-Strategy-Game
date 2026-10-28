import type { WindowLook } from '../../isoProps';
import type { ArchStyle } from '../style';

/*
 * The German age styles (M5, CLAUDE.md §4.2 "Fachwerk, vörös téglás,
 * csúcsos tornyok") — the cheap path: each rides an existing family
 * through palette, roof profile and the shared kits (alemannic framing,
 * stepped gables, needle spires); the bespoke painters are only the
 * Porta Nigra town centre (age 1) and the Kaiserdom Wonder (age 3).
 */

/** Small bullseye panes in dark frames; warm firelight at night. */
const BULLSEYE_WINDOW: WindowLook = { frame: 0x2a1d16, glassTop: 0xffe0a0, glassBottom: 0xc8873a, bars: 0x2a1d16 };

/** Age 1 (Római kor): Limes — red Trier sandstone, framed upper storeys, steep shingle; Porta Nigra town centre. */
export const GERMAN_LIMES: ArchStyle = {
  id: 'limes',
  family: 'porta_nigra',
  palette: {
    stone: 0x9a5243,
    ashlar: 0xb06855,
    plaster: 0xebe0c6,
    plasterDeep: 0xd8c7a4,
    timber: 0x6a3a24,
    darkWood: 0x4e3423,
    board: 0x6b4a30,
    brick: 0x9a5243,
    rawBrick: 0x9a5243,
    stack: 0x8c4a3c,
    planks: 0x6b4a30,
    doors: { main: 0x4a2c18, gate: 0x3e2616, work: 0x3a2414 },
    roof: 0x5f4b3d,
    roofAlt: 0x5d5a55,
    thatch: 0xa88a50,
    trim: 0xe6d8bc,
    metal: 0x5f9e88,
    shutter: 0x6e2a20,
    window: BULLSEYE_WINDOW,
    roofs: {
      lumber_camp: 0x66492f,
      mining_camp: 0x574a42,
      archery_range: 0x52443a,
      stable: 0x6a5440,
      blacksmith: 0x4d4842,
    },
  },
  roof: { pitch: 1.35, eave: 1, form: 'native', material: 'shingle' },
  ornaments: { chimneys: true, halfTimber: true, quoins: false, pilasters: false, dormers: false, boardedGables: false },
  charge: 'eagle',
  seedSalt: 20483,
  headroom: 40,
  kits: { framing: 'alemannic', framedUpper: true },
};

/** Age 2 (Középkor): Fachwerk — red-ochre framing on cream, plain red tile, stepped gables, slate needle spires. */
export const GERMAN_FACHWERK: ArchStyle = {
  id: 'fachwerk',
  family: 'tudor',
  palette: {
    stone: 0x9a6a58,
    ashlar: 0xb57f6a,
    plaster: 0xf0e5c9,
    plasterDeep: 0xe2d3b0,
    timber: 0x8c3a22,
    darkWood: 0x4a2e20,
    board: 0x5a3a26,
    brick: 0x9c4a32,
    rawBrick: 0xa0583c,
    stack: 0x8e4a34,
    planks: 0x5a3a26,
    doors: { main: 0x5a2a18, gate: 0x4a2616, work: 0x3e2214 },
    roof: 0xaa4a2e,
    roofAlt: 0x4a5260,
    thatch: 0xa58c55,
    trim: 0xf0e5c9,
    metal: 0x434b58,
    shutter: 0x2f5a3a,
    window: BULLSEYE_WINDOW,
    towerStone: 0xa87562,
    roofs: {},
  },
  roof: { pitch: 1.5, eave: 1, form: 'native', material: 'tile' },
  ornaments: { chimneys: false, halfTimber: true, quoins: false, pilasters: false, dormers: true, boardedGables: false },
  charge: 'eagle',
  seedSalt: 24593,
  headroom: 50,
  kits: { framing: 'alemannic', jetties: false, steppedGables: 'wall', needleSpires: true },
};

/** Cream-painted sashes over glass reflecting the sky (the dusk glow lights it at night). */
const CREAM_SASH: WindowLook = { frame: 0xeadfc4, glassTop: 0x8d9ba6, glassBottom: 0x3c3a40, bars: 0xeadfc4 };

/** Age 3 (Felvilágosodás): Backstein — dark brick, cream trim, steep red tile, stepped brick gables, green copper spires. */
export const GERMAN_BACKSTEIN: ArchStyle = {
  id: 'backstein',
  family: 'kaiserdom',
  palette: {
    stone: 0x8a5a4c,
    ashlar: 0xd8cbad,
    plaster: 0xe8dcc0,
    plasterDeep: 0xd5c39c,
    timber: 0x3a2a20,
    darkWood: 0x2f2620,
    board: 0x2f2620,
    brick: 0x7a3122,
    rawBrick: 0x8f4a32,
    stack: 0x6a2c20,
    planks: 0x4a3628,
    doors: { main: 0x27392c, gate: 0x3a2a20, work: 0x3a2a20 },
    roof: 0xa6442a,
    roofAlt: 0x4a5058,
    thatch: 0xa58c55,
    trim: 0xeadfc4,
    metal: 0x5f9e88,
    shutter: 0x27392c,
    window: CREAM_SASH,
    roofs: {},
  },
  roof: { pitch: 1.5, eave: 1, form: 'gable', material: 'tile' },
  ornaments: { chimneys: true, halfTimber: false, quoins: false, pilasters: false, dormers: true, boardedGables: false },
  charge: 'eagle',
  seedSalt: 28687,
  headroom: 40,
  kits: { steppedGables: 'brick', needleSpires: true },
};
