import type { UnitType } from '../../../../types';
import type { UnitLook } from '../looks';
import { M } from '../materials';
import { RUSSIAN_M } from './russianMaterials';

const R = RUSSIAN_M;

/**
 * Russian unit looks (M5), overriding the base look type by type. Same
 * rigs, poses and stats; white, blue and red liveries and one
 * silhouette cue per age: the tall pointed shelom with its mail
 * aventail on the druzhina (age 1), the tall needle-spiked shishak on
 * the pikeman, the crossbowman and the knight, the knight's
 * crimson-rimmed teardrop shield with the St Andrew's saltire (age 2;
 * the swordsman carries it too), and the Streltsy's fur-trimmed
 * kolpak, a long kaftan and the berdysh on the back (age 3). Team
 * colour stays on the shirts, kaftans, kolpaks and the shield field, so
 * ownership reads first; the legs are near-black wool, the civ's blue
 * and white only in the small outlined saltire badge.
 */
export const RUSSIAN_LOOKS: Readonly<Partial<Record<UnitType, UnitLook>>> = {
  villager: {
    kind: 'foot',
    human: {
      hat: 'cap',
      body: M.team,
      skirt: { mat: M.team, length: 7 },
      sleeves: M.team,
      legs: M.linen,
      boots: M.leather,
      belt: R.crimson,
      weapon: 'tool',
    },
  },
  swordsman: {
    kind: 'foot',
    human: {
      hat: 'shelom',
      body: M.team,
      armour: M.mail,
      skirt: { mat: M.team, length: 7 },
      sleeves: M.team,
      legs: R.wool,
      boots: M.leather,
      belt: M.darkLeather,
      weapon: 'gladius',
      shield: 'teardropShield',
    },
  },
  archer: {
    kind: 'foot',
    human: {
      hat: 'hood',
      body: M.team,
      skirt: { mat: M.team, length: 6 },
      sleeves: M.team,
      legs: R.wool,
      boots: M.boot,
      belt: M.darkLeather,
      back: 'quiver',
      weapon: 'bow',
    },
  },
  pikeman: {
    kind: 'foot',
    human: {
      hat: 'shishak',
      body: M.team,
      armour: M.mail,
      skirt: { mat: M.team, length: 7 },
      sleeves: M.team,
      legs: R.wool,
      boots: M.boot,
      belt: M.darkLeather,
      weapon: 'pike',
    },
  },
  crossbowman: {
    kind: 'foot',
    human: {
      hat: 'shishak',
      body: M.teamQuilted,
      skirt: { mat: M.teamQuilted, length: 7 },
      sleeves: M.teamQuilted,
      legs: R.wool,
      boots: M.boot,
      belt: M.leather,
      back: 'bolts',
      weapon: 'crossbow',
    },
  },
  musketeer: {
    kind: 'foot',
    human: {
      hat: 'kolpak',
      body: M.team,
      skirt: { mat: M.team, length: 12 },
      sleeves: M.team,
      legs: R.wool,
      boots: M.blackBoot,
      highBoots: true,
      belt: M.darkLeather,
      crossBelts: M.darkLeather,
      back: 'berdysh',
      weapon: 'musket',
    },
  },
  scout: {
    kind: 'rider',
    human: {
      hat: 'shelom',
      body: M.team,
      skirt: { mat: M.team, length: 4 },
      sleeves: M.team,
      legs: R.wool,
      boots: M.boot,
      highBoots: true,
      belt: M.leather,
      weapon: 'spear',
    },
    horse: { coat: R.dun, mane: M.horse.mane, saddleCloth: true },
  },
  knight: {
    kind: 'rider',
    human: {
      hat: 'shishak',
      body: M.team,
      pauldrons: M.steel,
      skirt: { mat: M.team, length: 6 },
      sleeves: M.mail,
      forearms: M.steel,
      hands: M.darkSteel,
      legs: M.mail,
      boots: M.blackBoot,
      highBoots: true,
      belt: M.darkLeather,
      weapon: 'lance',
      shield: 'teardropShield',
    },
    horse: { coat: R.dun, mane: M.horse.mane, barding: true },
  },
  cavalry: {
    kind: 'rider',
    human: {
      hat: 'kolpak',
      body: M.team,
      skirt: { mat: M.team, length: 6 },
      sleeves: M.team,
      legs: R.wool,
      boots: M.blackBoot,
      highBoots: true,
      belt: M.leather,
      crossBelts: M.gold,
      weapon: 'sabre',
    },
    horse: { coat: R.dun, mane: M.horse.mane, saddleCloth: true },
  },
  cannon: { kind: 'cannon', barrel: R.barrel },
};
