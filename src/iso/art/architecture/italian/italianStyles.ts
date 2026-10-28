import type { WindowLook } from '../../isoProps';
import type { ArchStyle, Ornaments } from '../style';

/*
 * The Italian age styles (M5, CLAUDE.md §4.2 "Reneszánsz, árkádok,
 * terrakotta"). Every age stands tall: storeys and arcades, not roofs.
 * - Age 1 is the Etruria family (Roman layouts' sizes, painters of its
 *   own): three-storey brick insulae over arched shops (tabernae) with
 *   wooden balconies and low terracotta hips; the town centre is a
 *   basilica with two tiers of arcades.
 * - Age 2 is the bespoke Comune family: brick tower-houses (San
 *   Gimignano) with swallowtail (Ghibelline) merlons, loggias and low
 *   tile roofs; the town centre is a Palazzo Pubblico with a slender
 *   Mangia-like tower.
 * - Age 3 is the bespoke Rinascimento family: rusticated palazzi under
 *   heavy cornices (cornicioni), arcaded loggias, very low hips and small
 *   lantern domes; the Wonder is a Florentine Duomo with its campanile.
 */

const PLAIN: Ornaments = { chimneys: true, halfTimber: false, quoins: false, pilasters: false, dormers: false, boardedGables: false };

/** Small lamplit windows in dark walnut frames (age 1). */
const ROMAN_WINDOW: WindowLook = { frame: 0x3a2a1e, glassTop: 0xffd88a, glassBottom: 0xc7772f, bars: 0x3a2a1e };

/** Age 1 (Római kor): Etruria — Roman brick, travertine courses, terracotta. */
export const ITALIAN_ETRURIA: ArchStyle = {
  id: 'etruria',
  family: 'etruria',
  palette: {
    stone: 0xa59a86,
    // Travertine: string courses, arches, steps.
    ashlar: 0xddd2b8,
    // Ochre stucco of upper storeys.
    plaster: 0xe0b878,
    plasterDeep: 0xc98f4e,
    timber: 0x6a4a30,
    darkWood: 0x4f3826,
    board: 0x7a5636,
    // Opus latericium: thin orange Roman bricks.
    brick: 0xbf6a40,
    rawBrick: 0xbf6a40,
    stack: 0xb2603a,
    planks: 0x7a5636,
    doors: { main: 0x5a3a22, gate: 0x4d321e, work: 0x47301f },
    roof: 0xb9562f,
    roofAlt: 0xa84e2c,
    thatch: 0xc8a25c,
    trim: 0xe6dcc4,
    metal: 0x6f8f6a,
    shutter: 0x5b6b3a,
    window: ROMAN_WINDOW,
    roofs: {},
  },
  roof: { pitch: 0.6, eave: 1, form: 'native', material: 'tile' },
  ornaments: PLAIN,
  charge: 'tricolore',
  seedSalt: 57347,
  dropHiddenGlows: true,
  headroom: 0,
};

/** Pointed (Sienese) lights in dark oak frames (age 2). */
const GOTHIC_WINDOW: WindowLook = { frame: 0x2e2118, glassTop: 0xffd690, glassBottom: 0xc0702c, bars: 0x2e2118, arch: 'pointed' };

/** Age 2 (Középkor): Comune — Sienese brick, travertine bases, swallowtail merlons, tower-houses. */
export const ITALIAN_COMUNE: ArchStyle = {
  id: 'comune',
  family: 'comune',
  palette: {
    // Pietra (grey sandstone) bases of the towers.
    stone: 0xa39886,
    // Travertine: crowns, string courses, the Mangia's belfry.
    ashlar: 0xe2dbc8,
    plaster: 0xd8bf92,
    plasterDeep: 0xb98a55,
    timber: 0x5a3e28,
    darkWood: 0x4a3322,
    board: 0x6c4e33,
    // Burnt Sienese brick.
    brick: 0xa8553a,
    rawBrick: 0xa8553a,
    stack: 0xa0503a,
    planks: 0x6c4e33,
    doors: { main: 0x4a2f1c, gate: 0x45301e, work: 0x3f2a1a },
    roof: 0xad532f,
    roofAlt: 0x9d4b2b,
    thatch: 0xc8a25c,
    trim: 0xeae2cf,
    metal: 0x4d4842,
    shutter: 0x4f5e37,
    window: GOTHIC_WINDOW,
    roofs: {},
  },
  roof: { pitch: 0.55, eave: 1, form: 'native', material: 'tile' },
  ornaments: PLAIN,
  charge: 'tricolore',
  seedSalt: 61441,
  dropHiddenGlows: true,
  headroom: 0,
};

/** Tall casements in grey pietra serena frames (age 3). */
const SERENA_WINDOW: WindowLook = { frame: 0x5f6266, glassTop: 0xffdc96, glassBottom: 0xc47a33, bars: 0x3a3c40 };

/** Age 3 (Felvilágosodás): Rinascimento — honey pietraforte, white intonaco, grey pietra serena, cornicioni, small domes. */
export const ITALIAN_RINASCIMENTO: ArchStyle = {
  id: 'rinascimento',
  family: 'rinascimento',
  palette: {
    // Rusticated pietraforte of the ground storeys.
    stone: 0xb39a72,
    // Dressed pietraforte of the palazzi.
    ashlar: 0xcdb48a,
    // White intonaco of loggias and chapels.
    plaster: 0xefe6d2,
    plasterDeep: 0xdcc394,
    timber: 0x5b3f29,
    darkWood: 0x4b3424,
    board: 0x6d4f35,
    brick: 0xb8643f,
    rawBrick: 0xc08a62,
    stack: 0xb0603e,
    planks: 0x6d4f35,
    doors: { main: 0x5a3720, gate: 0x4e321e, work: 0x47301f },
    roof: 0xb9592f,
    roofAlt: 0xae5130,
    thatch: 0xc8a25c,
    // Pietra serena: arches, columns, cornices on white walls.
    trim: 0x8d9094,
    // Terracotta domes.
    metal: 0xbd5b32,
    shutter: 0x56603f,
    window: SERENA_WINDOW,
    roofs: {},
  },
  roof: { pitch: 0.25, eave: 1, form: 'native', material: 'tile' },
  ornaments: PLAIN,
  charge: 'tricolore',
  seedSalt: 65537,
  dropHiddenGlows: true,
  headroom: 0,
};
