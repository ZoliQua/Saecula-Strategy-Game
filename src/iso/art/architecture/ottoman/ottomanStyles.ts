import type { WindowLook } from '../../isoProps';
import type { ArchStyle } from '../style';

/*
 * The Ottoman age styles (M21, CLAUDE.md §4.2 "Sávos fal, ólomkupolák,
 * minaretek").
 * - Age 1 (byzantine): Romano-Byzantine Anatolia — walls of brick bands
 *   laced through limestone courses (opus mixtum), low saucer domes in
 *   tile over the halls, low tiled roofs.
 * - Age 2 (seljuk): Seljuk Anatolia — honey-coloured carved ashlar,
 *   tall projecting portals (pishtaq) framed in turquoise tile, conical-
 *   roofed kümbet tomb towers, a caravanserai court as town centre.
 * - Age 3 (osmanli): classical Ottoman — cascading lead domes and a
 *   pencil minaret on the town centre; timber-framed houses with a
 *   projecting upper storey (cumba) under wide-eaved low hips (the
 *   house paints its own wide eave; the style keeps the families' eave,
 *   so shared painters' windows stay clear); the
 *   Wonder is the Süleymaniye.
 */

/** Small round-headed lights in brick surrounds (age 1). */
const BYZANTINE_WINDOW: WindowLook = { frame: 0x6e3424, glassTop: 0xffd690, glassBottom: 0xc47a34, bars: 0x5a2a1c };
/** Pointed lights in carved stone (age 2). */
const SELJUK_WINDOW: WindowLook = { frame: 0x7a5a34, glassTop: 0xffd27a, glassBottom: 0xb8692a, bars: 0x4a3420, arch: 'pointed' };
/** Pointed lights under white surrounds with lattice (age 3). */
const OSMANLI_WINDOW: WindowLook = { frame: 0x3a2a1c, glassTop: 0xffdc96, glassBottom: 0xc47a33, bars: 0x3a2a1c, arch: 'pointed' };

/** Age 1 (Római kor): byzantine — red brick bands in pale limestone, terracotta saucer domes. */
export const OTTOMAN_BYZANTINE: ArchStyle = {
  id: 'byzantine',
  family: 'byzantine',
  palette: {
    // Limestone courses of the banded walls.
    stone: 0xcdbf9e,
    ashlar: 0xddd0b2,
    plaster: 0xd8c6a2,
    plasterDeep: 0xbfa680,
    timber: 0x5a3e28,
    darkWood: 0x5e4430,
    board: 0x7a5a3c,
    // Thin red bricks laid in thick mortar.
    brick: 0xa4513a,
    rawBrick: 0xa8603f,
    stack: 0x9a4a32,
    planks: 0x7a5a3c,
    doors: { main: 0x4a2e1a, gate: 0x3e2614, work: 0x3e2614 },
    // Low terracotta roofs and tiled saucer domes.
    roof: 0xb4603e,
    roofAlt: 0x9a5236,
    thatch: 0xb08d4e,
    trim: 0xe6dbc0,
    metal: 0xb06a46,
    shutter: 0x4a2e1a,
    window: BYZANTINE_WINDOW,
    roofs: {},
  },
  roof: { pitch: 0.55, eave: 1, form: 'native', material: 'tile' },
  ornaments: { chimneys: false, halfTimber: false, quoins: false, pilasters: false, dormers: false, boardedGables: false },
  charge: 'crescent',
  seedSalt: 106501,
  dropHiddenGlows: true,
  headroom: 0,
};

/** Age 2 (Középkor): seljuk — honey ashlar, turquoise tile frames, stone kümbet cones. */
export const OTTOMAN_SELJUK: ArchStyle = {
  id: 'seljuk',
  family: 'seljuk',
  palette: {
    stone: 0xb89766,
    // Honey-coloured carved ashlar.
    ashlar: 0xcfae78,
    plaster: 0xd7bc8a,
    plasterDeep: 0xbb9c68,
    timber: 0x5a3e24,
    darkWood: 0x5e4228,
    board: 0x7a5a36,
    brick: 0x9e5a3a,
    rawBrick: 0xa8703f,
    stack: 0x9a6a42,
    planks: 0x7a5a36,
    doors: { main: 0x4a301a, gate: 0x3e2814, work: 0x3e2814 },
    // Low stone-slab roofs and the kümbets' cones.
    roof: 0x9a8268,
    roofAlt: 0x8a7258,
    thatch: 0xb08d4e,
    // Turquoise glazed tile of portals and friezes.
    trim: 0x2f9e9a,
    metal: 0x3a8f8a,
    shutter: 0x4a301a,
    window: SELJUK_WINDOW,
    roofs: {},
  },
  roof: { pitch: 0.45, eave: 1, form: 'native', material: 'slate' },
  ornaments: { chimneys: false, halfTimber: false, quoins: false, pilasters: false, dormers: false, boardedGables: false },
  charge: 'crescent',
  seedSalt: 110597,
  dropHiddenGlows: true,
  headroom: 0,
};

/** Age 3 (Felvilágosodás): osmanli — white limestone, lead domes, low red tile hips. */
export const OTTOMAN_OSMANLI: ArchStyle = {
  id: 'osmanli',
  family: 'osmanli',
  palette: {
    stone: 0xd4cbb8,
    // Pale cut limestone of mosques and halls.
    ashlar: 0xe2dac8,
    // Whitewashed upper storeys of the houses.
    plaster: 0xf1ece0,
    plasterDeep: 0xe0d6c2,
    timber: 0x5a3a22,
    darkWood: 0x5e3e26,
    board: 0x7a4e2c,
    brick: 0xa2563a,
    rawBrick: 0xa8603f,
    stack: 0xa2563a,
    planks: 0x6e4a2c,
    doors: { main: 0x4a2c18, gate: 0x3e2614, work: 0x3e2614 },
    // Red pantiles of the low, wide-eaved hips.
    roof: 0xae5038,
    roofAlt: 0x96462f,
    thatch: 0xb08d4e,
    trim: 0xece6d8,
    // Lead of the domes and the minaret caps.
    metal: 0x8a939c,
    shutter: 0x3f6a4a,
    window: OSMANLI_WINDOW,
    roofs: {},
  },
  roof: { pitch: 0.45, eave: 1.0, form: 'hip', material: 'tile' },
  ornaments: { chimneys: true, halfTimber: false, quoins: false, pilasters: false, dormers: false, boardedGables: false, streetGables: false },
  charge: 'crescent',
  seedSalt: 114689,
  dropHiddenGlows: true,
  headroom: 0,
};
