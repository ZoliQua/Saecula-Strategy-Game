import type { UnitType } from '../../../../types';
import type { UnitLook } from '../looks';
import { M } from '../materials';
import { shipFleet } from '../ship';
import { tradeCartLook } from '../wagon';
import { OTTOMAN_M } from './ottomanMaterials';

const O = OTTOMAN_M;

/** Hull wood and red trim of the Ottoman ships and trade cart. */
const HULL = 0x5e3c24;
const TRIM = 0xb02a26;

/**
 * Ottoman unit looks (M21), overriding the base look type by type. Same
 * rigs, poses and stats; wide dark şalvar on the legs, morocco boots,
 * and one silhouette cue per age: the kranos with its fore-and-aft team
 * crest on the swordsman, the archer and the scout, the swordsman with
 * the tall oval shield (age 1); the turban-wrapped spiked helm on the
 * knight, the pikeman and the crossbowman (age 2); the börk, the tall
 * white felt cap folded down the back, on the musketeer, and the
 * turbaned helm on the sipahi cavalry (age 3). Team colour stays on the
 * kaftans, skirts, shield fields, the crest and the villager's cap, so
 * ownership reads first. The janissary (M21, in the crossbowman's slot,
 * on the archer's rig) wears the börk with a tall team plume, a long team
 * kaftan and yellow boots, and carries the short composite recurve bow.
 */
export const OTTOMAN_LOOKS: Readonly<Partial<Record<UnitType, UnitLook>>> = {
  // The civ's ships, hull wood and trim in its palette.
  ...shipFleet(HULL, TRIM),
  // The trade cart, its wood and trim in the ships' palette.
  trade_cart: tradeCartLook(HULL, TRIM, { coat: O.grey, mane: M.horse.mane }),
  villager: {
    kind: 'foot',
    human: {
      hat: 'takke',
      body: M.team,
      skirt: { mat: M.team, length: 7 },
      sleeves: M.linen,
      legs: O.salvar,
      boots: M.leather,
      belt: O.green,
      weapon: 'tool',
    },
  },
  swordsman: {
    kind: 'foot',
    human: {
      hat: 'kranos',
      body: M.team,
      armour: M.lorica,
      skirt: { mat: M.team, length: 7.5 },
      sleeves: M.team,
      legs: O.salvar,
      boots: O.redBoot,
      belt: M.darkLeather,
      weapon: 'gladius',
      shield: 'ovalShield',
    },
  },
  archer: {
    kind: 'foot',
    human: {
      hat: 'kranos',
      body: M.team,
      skirt: { mat: M.team, length: 6 },
      sleeves: M.team,
      legs: O.salvar,
      boots: O.redBoot,
      belt: M.darkLeather,
      back: 'quiver',
      weapon: 'bow',
    },
  },
  scout: {
    kind: 'rider',
    human: {
      hat: 'kranos',
      body: M.team,
      skirt: { mat: M.team, length: 4.5 },
      sleeves: M.team,
      legs: O.salvar,
      boots: O.yellowBoot,
      highBoots: true,
      belt: M.leather,
      weapon: 'spear',
    },
    horse: { coat: O.grey, mane: M.horse.mane, saddleCloth: true },
  },
  pikeman: {
    kind: 'foot',
    human: {
      hat: 'turbanHelm',
      body: M.team,
      armour: M.mail,
      skirt: { mat: M.team, length: 7 },
      sleeves: M.team,
      legs: O.salvar,
      boots: O.redBoot,
      belt: M.darkLeather,
      weapon: 'pike',
    },
  },
  crossbowman: {
    kind: 'foot',
    human: {
      hat: 'turbanHelm',
      body: M.teamQuilted,
      skirt: { mat: M.teamQuilted, length: 7 },
      sleeves: M.teamQuilted,
      legs: O.salvar,
      boots: O.redBoot,
      belt: M.leather,
      back: 'bolts',
      weapon: 'crossbow',
    },
  },
  knight: {
    kind: 'rider',
    human: {
      hat: 'turbanHelm',
      body: M.team,
      armour: M.mail,
      skirt: { mat: M.team, length: 7 },
      sleeves: M.mail,
      forearms: M.steel,
      hands: M.darkSteel,
      legs: O.salvar,
      boots: O.yellowBoot,
      highBoots: true,
      belt: M.darkLeather,
      weapon: 'lance',
      shield: 'ovalShield',
    },
    horse: { coat: M.horse.darkBay, mane: M.horse.mane, barding: true },
  },
  janissary: {
    kind: 'foot',
    human: {
      hat: 'borkPlume',
      body: M.team,
      skirt: { mat: M.team, length: 10 },
      sleeves: M.team,
      legs: O.salvar,
      boots: O.yellowBoot,
      belt: O.green,
      back: 'quiver',
      weapon: 'bow',
      weaponStyle: 'recurve',
    },
  },
  musketeer: {
    kind: 'foot',
    human: {
      hat: 'bork',
      body: M.team,
      skirt: { mat: M.team, length: 11 },
      sleeves: M.team,
      legs: O.salvar,
      boots: O.yellowBoot,
      highBoots: true,
      belt: O.green,
      crossBelts: M.darkLeather,
      weapon: 'musket',
    },
  },
  cavalry: {
    kind: 'rider',
    human: {
      hat: 'turbanHelm',
      body: M.team,
      armour: M.mail,
      skirt: { mat: M.team, length: 5.5 },
      sleeves: M.team,
      legs: O.salvar,
      boots: O.yellowBoot,
      highBoots: true,
      belt: M.darkLeather,
      weapon: 'sabre',
    },
    horse: { coat: O.grey, mane: M.horse.mane, saddleCloth: true },
  },
  cannon: { kind: 'cannon', barrel: O.barrel },
};
