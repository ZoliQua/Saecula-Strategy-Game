import type { UnitType } from '../../../../types';
import type { UnitLook } from '../looks';
import { M } from '../materials';
import { shipFleet } from '../ship';
import { tradeCartLook } from '../wagon';
import { POLISH_M } from './polishMaterials';

const P = POLISH_M;

/** Hull wood and gilt trim of the Polish ships and trade cart. */
const HULL = 0x6e4428;
const TRIM = 0xd4a017;

/**
 * Polish unit looks (M21), overriding the base look type by type. Same
 * rigs, poses and stats; dark homespun legs and one silhouette cue per
 * age: the tall conical Slavic helm with its team tuft on the
 * swordsman, the archer and the scout, the swordsman with the big round
 * shield (age 1); the kapalin kettle hat with its down-swept brim on
 * the pikeman and the crossbowman, and the crowned white eagle on the
 * knight's shield (age 2); the szyszak on the cavalry and the magierka
 * on the musketeer (age 3). Team colour stays on the coats, the shield
 * fields, the tuft and the cap crown, so ownership reads first. The
 * winged hussar (M21, in the cavalry's slot) wears the szyszak and a
 * bright cuirass over team sleeves and skirt, the two feathered wings
 * rising from his back high above his head, yellow boots, and rides a
 * grey under a team saddle cloth.
 */
export const POLISH_LOOKS: Readonly<Partial<Record<UnitType, UnitLook>>> = {
  // The civ's ships, hull wood and trim in its palette.
  ...shipFleet(HULL, TRIM),
  // The trade cart, its wood and trim in the ships' palette.
  trade_cart: tradeCartLook(HULL, TRIM, { coat: P.bay, mane: M.horse.mane }),
  villager: {
    kind: 'foot',
    human: {
      hat: 'straw',
      body: M.team,
      skirt: { mat: M.team, length: 6.5 },
      sleeves: M.linen,
      legs: P.wool,
      boots: M.leather,
      belt: M.darkLeather,
      weapon: 'tool',
    },
  },
  swordsman: {
    kind: 'foot',
    human: {
      hat: 'slavHelm',
      body: M.team,
      armour: M.mail,
      skirt: { mat: M.team, length: 7 },
      sleeves: M.team,
      legs: P.wool,
      boots: M.leather,
      belt: M.darkLeather,
      weapon: 'gladius',
      shield: 'slavShield',
    },
  },
  archer: {
    kind: 'foot',
    human: {
      hat: 'slavHelm',
      body: M.team,
      skirt: { mat: M.team, length: 5.5 },
      sleeves: M.team,
      legs: P.wool,
      boots: M.boot,
      belt: M.darkLeather,
      back: 'quiver',
      weapon: 'bow',
    },
  },
  scout: {
    kind: 'rider',
    human: {
      hat: 'slavHelm',
      body: M.team,
      skirt: { mat: M.team, length: 4 },
      sleeves: M.team,
      legs: P.wool,
      boots: M.boot,
      highBoots: true,
      belt: M.leather,
      weapon: 'spear',
    },
    horse: { coat: P.bay, mane: M.horse.mane, saddleCloth: true },
  },
  pikeman: {
    kind: 'foot',
    human: {
      hat: 'kapalin',
      body: M.team,
      armour: M.steel,
      skirt: { mat: M.team, length: 6 },
      sleeves: M.team,
      legs: P.wool,
      boots: M.boot,
      belt: M.darkLeather,
      weapon: 'pike',
    },
  },
  crossbowman: {
    kind: 'foot',
    human: {
      hat: 'kapalin',
      body: M.teamQuilted,
      skirt: { mat: M.teamQuilted, length: 6.5 },
      sleeves: M.teamQuilted,
      legs: P.wool,
      boots: M.boot,
      belt: M.leather,
      back: 'bolts',
      weapon: 'crossbow',
    },
  },
  knight: {
    kind: 'rider',
    human: {
      hat: 'greatHelm',
      body: M.team,
      armour: M.steel,
      skirt: { mat: M.team, length: 6 },
      sleeves: M.mail,
      forearms: M.steel,
      hands: M.darkSteel,
      legs: M.mail,
      boots: M.steel,
      highBoots: true,
      belt: M.darkLeather,
      weapon: 'lance',
      shield: 'eagleHeater',
    },
    horse: { coat: P.bay, mane: M.horse.mane, barding: true },
  },
  musketeer: {
    kind: 'foot',
    human: {
      hat: 'magierka',
      body: M.team,
      skirt: { mat: M.team, length: 11 },
      sleeves: M.team,
      legs: P.wool,
      boots: P.yellowBoot,
      highBoots: true,
      belt: M.leather,
      crossBelts: M.darkLeather,
      weapon: 'musket',
    },
  },
  cavalry: {
    kind: 'rider',
    human: {
      hat: 'szyszak',
      body: M.team,
      armour: M.steel,
      skirt: { mat: M.team, length: 5 },
      sleeves: M.team,
      legs: P.wool,
      boots: P.yellowBoot,
      highBoots: true,
      belt: M.darkLeather,
      weapon: 'sabre',
    },
    horse: { coat: P.bay, mane: M.horse.mane, saddleCloth: true },
  },
  winged_hussar: {
    kind: 'rider',
    human: {
      hat: 'szyszak',
      body: M.team,
      armour: M.steel,
      pauldrons: M.steel,
      skirt: { mat: M.team, length: 5 },
      sleeves: M.team,
      legs: P.wool,
      boots: P.yellowBoot,
      highBoots: true,
      belt: M.gold,
      back: 'hussarWings',
      weapon: 'sabre',
    },
    horse: { coat: M.horse.grey, mane: M.horse.lightMane, saddleCloth: true },
  },
  cannon: { kind: 'cannon', barrel: P.barrel },
};
