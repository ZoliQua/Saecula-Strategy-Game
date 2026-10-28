import type { WindowLook } from '../../isoProps';
import type { ArchStyle } from '../style';

/*
 * The French age styles (M5, CLAUDE.md §4.2 "Gótikus, világos kő,
 * karcsú tornyok"): pale limestone and blue slate in every age.
 * - Age 1 rides the Roman family under hipped slate roofs, with a
 *   Maison Carrée temple-forum town centre and a round Gallo-Roman tower.
 * - Age 2 is the bespoke Loire Gothic family: the medieval layouts with
 *   pepperpot turrets (kits/pepperpot.ts) and lancets, a château keep
 *   with four turrets and a round machicolated tower.
 * - Age 3 rides the baroque family under tall pavilion roofs
 *   (kits/pavilionRoof.ts) with oeil-de-boeuf dormers; the town centre
 *   is an hôtel de ville of pavilions and the Wonder is Versailles.
 */

const SLATE = 0x56616e;
const BLUE_SLATE = 0x4a5564;
const BLACK_SLATE = 0x39414d;

/** Lamplit small panes in dark oak (age 1). */
const LAMP_WINDOW: WindowLook = { frame: 0x3a2c22, glassTop: 0xffd890, glassBottom: 0xc47a34, bars: 0x3a2c22 };

/** Age 1 (Római kor): Gallo-Roman — pale limestone, blue-grey slate hips; Maison Carrée town centre. */
export const FRENCH_GALLO_ROMAN: ArchStyle = {
  id: 'gallo_roman',
  family: 'maison_carree',
  palette: {
    stone: 0xb9af9b,
    ashlar: 0xe2d9c3,
    plaster: 0xebe3cf,
    plasterDeep: 0xdcd0b5,
    timber: 0x76563a,
    darkWood: 0x5a4231,
    board: 0x6e5239,
    brick: 0xb26a4c,
    rawBrick: 0xb26a4c,
    stack: 0xa89e8c,
    planks: 0x6e5239,
    doors: { main: 0x4a3322, gate: 0x45301f, work: 0x3e2c1e },
    roof: SLATE,
    roofAlt: 0x515b67,
    thatch: SLATE,
    trim: 0xf3eee1,
    metal: 0x6f8c84,
    shutter: 0x3f5f80,
    window: LAMP_WINDOW,
    roofs: {
      lumber_camp: 0x59636f,
      mining_camp: 0x525a64,
      barracks: 0x5d6875,
      archery_range: 0x58626e,
      stable: 0x636c78,
      blacksmith: 0x4b525b,
    },
  },
  roof: { pitch: 1.2, eave: 1, form: 'hip', material: 'slate' },
  ornaments: { chimneys: true, halfTimber: false, quoins: false, pilasters: true, dormers: false, boardedGables: false },
  charge: 'fleur_de_lis',
  seedSalt: 32771,
  headroom: 30,
};

/** Leaded lancets: pointed heads, warm firelight at night. */
const LANCET_WINDOW: WindowLook = { frame: 0x2a2622, glassTop: 0xffe1a0, glassBottom: 0xc98a3e, bars: 0x2a2622, arch: 'pointed' };

/** Age 2 (Középkor): Loire Gothic — white tuffeau ashlar, blue slate, candle-snuffer turrets, lancets. */
export const FRENCH_GOTHIC: ArchStyle = {
  id: 'gothic_fr',
  family: 'gothic_fr',
  palette: {
    stone: 0xd6cdb9,
    ashlar: 0xe9e2cf,
    plaster: 0xeee7d6,
    plasterDeep: 0xe0d7c2,
    timber: 0x5a4231,
    darkWood: 0x4e3b2c,
    board: 0x67503b,
    brick: 0xa4644c,
    rawBrick: 0xa4644c,
    stack: 0xd2c9b4,
    planks: 0x67503b,
    doors: { main: 0x3e2a1c, gate: 0x3a281b, work: 0x352418 },
    roof: BLUE_SLATE,
    roofAlt: 0x465161,
    thatch: BLUE_SLATE,
    trim: 0xf4eee2,
    metal: 0x5d6672,
    shutter: 0x2f4a6e,
    window: LANCET_WINDOW,
    roofs: {},
  },
  roof: { pitch: 1.45, eave: 1, form: 'native', material: 'slate' },
  ornaments: { chimneys: true, halfTimber: false, quoins: false, pilasters: false, dormers: true, boardedGables: false },
  charge: 'fleur_de_lis',
  seedSalt: 36353,
  headroom: 80,
  kits: { pepperpots: true },
};

/** Tall casements with white frames and small panes over glass reflecting the sky (the dusk glow lights it). */
const CROISEE_WINDOW: WindowLook = { frame: 0xf3efe4, glassTop: 0x93a3b0, glassBottom: 0x3a3c46, bars: 0xf3efe4 };

/** Age 3 (Felvilágosodás): Classicisme — pale limestone, quoins, blue-black slate pavilion roofs, oeil-de-boeuf dormers. */
export const FRENCH_CLASSICISME: ArchStyle = {
  id: 'classicisme',
  family: 'versailles',
  palette: {
    stone: 0xcbc2ad,
    ashlar: 0xdcd4c0,
    plaster: 0xebe5d5,
    plasterDeep: 0xdfd6c2,
    timber: 0x4a3a2c,
    darkWood: 0x463629,
    board: 0x5a4a3a,
    brick: 0xb0725a,
    rawBrick: 0xb88a6c,
    stack: 0xd6cfbb,
    planks: 0x5a4a3a,
    doors: { main: 0x2c3e5a, gate: 0x3a3026, work: 0x3a3026 },
    roof: BLACK_SLATE,
    roofAlt: BLACK_SLATE,
    thatch: 0xa58c55,
    trim: 0xf7f2e6,
    metal: 0x5d6670,
    shutter: 0x6d7f8c,
    window: CROISEE_WINDOW,
    roofs: {},
  },
  roof: { pitch: 1.75, eave: 1, form: 'pavilion', material: 'slate' },
  ornaments: { chimneys: true, halfTimber: false, quoins: true, pilasters: true, dormers: true, boardedGables: false },
  charge: 'fleur_de_lis',
  seedSalt: 40961,
  headroom: 90,
};
