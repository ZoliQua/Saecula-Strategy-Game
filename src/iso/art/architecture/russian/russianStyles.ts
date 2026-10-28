import type { WindowLook } from '../../isoProps';
import type { ArchStyle } from '../style';

/*
 * The Russian age styles (M5, CLAUDE.md §4.2 "Hagymakupolás,
 * gerenda-ház, fenyő").
 * - Age 1 (rus_gord) is the bespoke log-town (izba) family: pine log
 *   cabins with steep plank gables, carved bargeboards and ridge horses;
 *   the town centre is a log hillfort tower on an earth rampart.
 * - Age 2 (muscovy) rides the same log-town layouts with white-stone
 *   ground storeys, green tent roofs (shatyor) and onion domes; the town
 *   centre is a white kremlin tower with a tent roof beside a cathedral.
 * - Age 3 (petrine) rides the baroque layouts (petrine family): turquoise
 *   render, white pilasters, green iron hips and gold onions on drums;
 *   the Wonder is St Basil's.
 */

/** Small lights in carved frames (ages 1-2). */
const LOG_WINDOW: WindowLook = { frame: 0x3b2a1c, glassTop: 0xffd88a, glassBottom: 0xc7772f, bars: 0x3b2a1c };

/** Age 1 (Római kor): rus_gord — pine logs, plank roofs, carved boards. */
export const RUSSIAN_GORD: ArchStyle = {
  id: 'rus_gord',
  family: 'izba',
  palette: {
    stone: 0x8f8676,
    ashlar: 0xb5ab98,
    // Daub and lime of ovens and smithies.
    plaster: 0xd9cdb4,
    plasterDeep: 0xb9a582,
    timber: 0x6e5236,
    // Weathered pine logs.
    darkWood: 0x8a6743,
    // Carved boards (prichelina, nalichniki): fresh pale pine.
    board: 0xd8bb88,
    brick: 0xa45a3c,
    rawBrick: 0xa45a3c,
    stack: 0x8a7c6a,
    planks: 0x7b6046,
    doors: { main: 0x5a3e24, gate: 0x4f3620, work: 0x4a321e },
    // Grey weathered plank roofs.
    roof: 0x7d7262,
    roofAlt: 0x6e6455,
    thatch: 0xb59a5e,
    trim: 0xe2cfa4,
    metal: 0x7d8288,
    shutter: 0x4f6f86,
    window: LOG_WINDOW,
    roofs: {},
  },
  roof: { pitch: 1, eave: 1, form: 'native', material: 'shingle' },
  ornaments: { chimneys: true, halfTimber: false, quoins: false, pilasters: false, dormers: false, boardedGables: false },
  charge: 'saltire',
  seedSalt: 69633,
  dropHiddenGlows: true,
  headroom: 0,
  kits: { logTown: { masonry: 'log', tents: false, onions: false, civic: 'hillfort' } },
};

/** Age 2 (Középkor): muscovy — white stone and logs, green tents, gold onions. */
export const RUSSIAN_MUSCOVY: ArchStyle = {
  id: 'muscovy',
  family: 'izba',
  palette: {
    stone: 0xcfc8b6,
    // Whitewashed limestone (belokamenny).
    ashlar: 0xeee9dc,
    plaster: 0xf2eee3,
    plasterDeep: 0xd9cfba,
    timber: 0x6a4e33,
    darkWood: 0x87633f,
    board: 0xdcc08e,
    // Kremlin brick of chimneys and smithies.
    brick: 0xa64a34,
    rawBrick: 0xa64a34,
    stack: 0xa64a34,
    planks: 0x7b6046,
    doors: { main: 0x6a2a22, gate: 0x4f3620, work: 0x4a321e },
    roof: 0x776c5d,
    // Green glazed tiles of the tents.
    roofAlt: 0x3f7a52,
    thatch: 0xb59a5e,
    trim: 0xe8d6aa,
    // Gold leaf of the onions.
    metal: 0xd9ab3c,
    shutter: 0x8a3a2c,
    window: LOG_WINDOW,
    roofs: {},
  },
  roof: { pitch: 1, eave: 1, form: 'native', material: 'shingle' },
  ornaments: { chimneys: true, halfTimber: false, quoins: false, pilasters: false, dormers: false, boardedGables: false },
  charge: 'saltire',
  seedSalt: 73729,
  dropHiddenGlows: true,
  headroom: 0,
  kits: { logTown: { masonry: 'whiteStone', tents: true, onions: true, civic: 'kremlin' } },
};

/** Tall white-framed casements (age 3). */
const PETRINE_WINDOW: WindowLook = { frame: 0xf4f0e6, glassTop: 0xffdc96, glassBottom: 0xc47a33, bars: 0xe8e2d4 };

/** Age 3 (Felvilágosodás): petrine — turquoise render, white orders, green iron hips, gold onions. */
export const RUSSIAN_PETRINE: ArchStyle = {
  id: 'petrine',
  family: 'petrine',
  palette: {
    stone: 0xd4cebf,
    ashlar: 0xe6e1d4,
    // Elizabethan turquoise render.
    plaster: 0x5fb5ad,
    plasterDeep: 0x4c9e97,
    timber: 0x5e4630,
    darkWood: 0x6e5034,
    board: 0x7a5a3a,
    brick: 0xa85a3e,
    rawBrick: 0xc8a888,
    stack: 0xe8e3d6,
    planks: 0x6f5a44,
    doors: { main: 0x2e4a3c, gate: 0x3a3026, work: 0x3a3026 },
    // Green painted iron.
    roof: 0x4a7f5a,
    roofAlt: 0x4a7f5a,
    thatch: 0xa58c55,
    // White orders and window frames.
    trim: 0xf6f2e8,
    // Gold leaf.
    metal: 0xdfae3e,
    shutter: 0x3e6a5a,
    window: PETRINE_WINDOW,
    // White and red-striped guard box.
    sentry: { field: 0xf2efe6, chevron: 0xc0302a },
    roofs: {},
  },
  roof: { pitch: 0.85, eave: 1, form: 'hip', material: 'copper' },
  ornaments: { chimneys: true, halfTimber: false, quoins: true, pilasters: true, dormers: false, boardedGables: false, streetGables: false },
  charge: 'saltire',
  seedSalt: 77825,
  dropHiddenGlows: true,
  headroom: 80,
  kits: { onionDomes: true },
};
