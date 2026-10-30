import type { UnitType } from '../../../../types';
import type { UnitLook } from '../looks';
import { M } from '../materials';
import { GERMAN_M } from './germanMaterials';

const G = GERMAN_M;

/**
 * German unit looks (M5), overriding the base look type by type. Same
 * rigs, poses and stats; black, gold and red liveries and one silhouette
 * cue per age: the Germanic warrior's Spangenhelm and oval board shield
 * (age 1), the Landsknecht's plumed, slashed beret and the knight's
 * horned pot helm with the eagle shield (age 2), the spiked leather helm
 * of the musketeer and the cuirassier (age 3). Team colour stays on the
 * tunics, doublets, coats, berets, shield faces and horns, so ownership
 * reads first. The Landsknecht unique unit (M8, in the pikeman's slot)
 * wears the great plumed beret, puffed team-and-white slashing, striped
 * hose and the Katzbalger at the hip.
 */
export const GERMAN_LOOKS: Readonly<Partial<Record<UnitType, UnitLook>>> = {
  villager: {
    kind: 'foot',
    human: {
      hat: 'cap',
      body: M.team,
      skirt: { mat: M.team, length: 5 },
      sleeves: M.linen,
      legs: G.loden,
      boots: M.boot,
      belt: M.darkLeather,
      weapon: 'tool',
    },
  },
  swordsman: {
    kind: 'foot',
    human: {
      hat: 'spangenhelm',
      body: M.team,
      skirt: { mat: M.team, length: 6.5 },
      sleeves: M.team,
      forearms: M.skin,
      legs: G.loden,
      boots: M.leather,
      belt: M.darkLeather,
      weapon: 'gladius',
      shield: 'boardShield',
    },
  },
  archer: {
    kind: 'foot',
    human: {
      hat: 'hood',
      body: M.teamQuilted,
      skirt: { mat: M.teamQuilted, length: 5 },
      sleeves: G.loden,
      legs: G.hose,
      boots: M.boot,
      belt: M.darkLeather,
      back: 'quiver',
      weapon: 'bow',
    },
  },
  pikeman: {
    kind: 'foot',
    human: {
      hat: 'landsknecht',
      body: G.slashed,
      skirt: { mat: G.slashed, length: 4.5 },
      sleeves: G.slashed,
      legs: G.hose,
      boots: M.boot,
      belt: M.darkLeather,
      weapon: 'pike',
    },
  },
  landsknecht: {
    kind: 'foot',
    human: {
      hat: 'grandBeret',
      body: G.slashedWhite,
      skirt: { mat: G.slashedWhite, length: 3.5 },
      sleeves: G.slashedWhite,
      puffedSleeves: true,
      legs: G.stripedHose,
      boots: M.boot,
      belt: M.darkLeather,
      back: 'katzbalger',
      weapon: 'pike',
    },
  },
  crossbowman: {
    kind: 'foot',
    human: {
      hat: 'landsknecht',
      body: M.teamQuilted,
      skirt: { mat: M.teamQuilted, length: 6 },
      sleeves: G.slashed,
      legs: G.loden,
      boots: M.boot,
      belt: M.leather,
      back: 'bolts',
      weapon: 'crossbow',
    },
  },
  musketeer: {
    kind: 'foot',
    human: {
      hat: 'pickelhaube',
      body: M.team,
      skirt: { mat: M.team, length: 9.5 },
      sleeves: M.team,
      legs: M.white,
      boots: M.blackBoot,
      highBoots: true,
      belt: G.blackLeather,
      crossBelts: M.white,
      weapon: 'musket',
    },
  },
  scout: {
    kind: 'rider',
    human: {
      hat: 'spangenhelm',
      body: M.team,
      skirt: { mat: M.team, length: 3.5 },
      sleeves: M.team,
      legs: G.loden,
      boots: M.boot,
      highBoots: true,
      belt: M.leather,
      weapon: 'spear',
    },
    horse: { coat: G.black, mane: M.horse.mane, saddleCloth: true },
  },
  knight: {
    kind: 'rider',
    human: {
      hat: 'hornedHelm',
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
      shield: 'eagle',
    },
    horse: { coat: M.horse.grey, mane: M.horse.lightMane, barding: true },
  },
  cavalry: {
    kind: 'rider',
    human: {
      hat: 'pickelhaube',
      body: M.team,
      sleeves: M.team,
      legs: M.white,
      boots: M.blackBoot,
      highBoots: true,
      belt: M.white,
      crossBelts: M.white,
      weapon: 'sabre',
    },
    horse: { coat: G.black, mane: M.horse.mane, saddleCloth: true },
  },
  cannon: { kind: 'cannon', barrel: G.barrel },
};
