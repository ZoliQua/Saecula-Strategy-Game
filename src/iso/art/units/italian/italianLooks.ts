import type { UnitType } from '../../../../types';
import type { UnitLook } from '../looks';
import { M } from '../materials';
import { ITALIAN_M } from './italianMaterials';

const I = ITALIAN_M;

/**
 * Italian unit looks (M5), overriding the base look type by type. Same
 * rigs, poses and stats; green, white and red liveries and one
 * silhouette cue per age: the Samnite helm with its three tall white
 * feathers (age 1), the deep Venetian barbute on the knight, the
 * pikeman and the crossbowman, who carries the tall Genoese pavise on
 * his back, and the knight's tricolour shield (age 2), and the
 * wide-brimmed hat with its cascade of dark cock feathers on the
 * musketeer and the dragoon (age 3). Team colour stays on the tunics,
 * doublets, coats, shield and pavise faces, so ownership reads first;
 * the civ's green is a near-black bottle green on the legs, its red and
 * green only in narrow outlined pales. The legionary (M8, in the
 * swordsman's slot) wears the lorica segmentata over a team tunic, the
 * galea with its team crest athwart, and carries the great curved team
 * scutum with the gold winged thunderbolt.
 */
export const ITALIAN_LOOKS: Readonly<Partial<Record<UnitType, UnitLook>>> = {
  villager: {
    kind: 'foot',
    human: {
      hat: 'cap',
      body: M.team,
      skirt: { mat: M.team, length: 6 },
      sleeves: M.linen,
      legs: I.hose,
      boots: M.leather,
      belt: M.darkLeather,
      weapon: 'tool',
    },
  },
  swordsman: {
    kind: 'foot',
    human: {
      hat: 'samniteHelm',
      body: M.team,
      skirt: { mat: M.team, length: 6.5 },
      sleeves: M.team,
      forearms: M.skin,
      legs: M.skin,
      boots: M.leather,
      belt: I.bronze,
      weapon: 'gladius',
      shield: 'scutum',
    },
  },
  legionary: {
    kind: 'foot',
    human: {
      hat: 'transverseGalea',
      body: M.team,
      armour: I.segmentata,
      pauldrons: I.segmentata,
      skirt: { mat: M.team, length: 7.5 },
      sleeves: M.team,
      forearms: M.skin,
      legs: M.skin,
      boots: M.leather,
      belt: M.brass,
      back: 'cingulum',
      weapon: 'gladius',
      shield: 'legionScutum',
    },
  },
  archer: {
    kind: 'foot',
    human: {
      hat: 'hood',
      body: M.team,
      skirt: { mat: M.team, length: 5.5 },
      sleeves: M.linen,
      legs: I.hose,
      boots: M.boot,
      belt: M.darkLeather,
      back: 'quiver',
      weapon: 'bow',
    },
  },
  pikeman: {
    kind: 'foot',
    human: {
      hat: 'barbute',
      body: M.team,
      armour: M.steel,
      skirt: { mat: M.team, length: 6.5 },
      sleeves: M.team,
      legs: I.hose,
      boots: M.boot,
      belt: M.darkLeather,
      weapon: 'pike',
    },
  },
  crossbowman: {
    kind: 'foot',
    human: {
      hat: 'barbute',
      body: M.teamQuilted,
      skirt: { mat: M.teamQuilted, length: 6.5 },
      sleeves: M.teamQuilted,
      legs: I.hose,
      boots: M.boot,
      belt: M.leather,
      back: 'pavise',
      weapon: 'crossbow',
    },
  },
  musketeer: {
    kind: 'foot',
    human: {
      hat: 'cappello',
      body: M.team,
      skirt: { mat: M.team, length: 9 },
      sleeves: M.team,
      legs: I.hose,
      boots: M.blackBoot,
      highBoots: true,
      belt: M.leather,
      crossBelts: M.white,
      weapon: 'musket',
    },
  },
  scout: {
    kind: 'rider',
    human: {
      hat: 'samniteHelm',
      body: M.team,
      skirt: { mat: M.team, length: 3.5 },
      sleeves: M.team,
      legs: M.linen,
      boots: M.boot,
      highBoots: true,
      belt: M.leather,
      weapon: 'spear',
    },
    horse: { coat: I.morello, mane: M.horse.mane, saddleCloth: true },
  },
  knight: {
    kind: 'rider',
    human: {
      hat: 'barbute',
      body: M.team,
      pauldrons: M.steel,
      skirt: { mat: M.team, length: 5.5 },
      sleeves: M.mail,
      forearms: M.steel,
      hands: M.darkSteel,
      legs: M.mail,
      boots: M.steel,
      highBoots: true,
      belt: M.darkLeather,
      weapon: 'lance',
      shield: 'tricoloreShield',
    },
    horse: { coat: I.morello, mane: M.horse.mane, barding: true },
  },
  cavalry: {
    kind: 'rider',
    human: {
      hat: 'cappello',
      body: M.team,
      sleeves: M.team,
      legs: M.linen,
      boots: M.blackBoot,
      highBoots: true,
      belt: M.leather,
      crossBelts: M.gold,
      weapon: 'sabre',
    },
    horse: { coat: I.morello, mane: M.horse.lightMane, saddleCloth: true },
  },
  cannon: { kind: 'cannon', barrel: I.barrel },
};
