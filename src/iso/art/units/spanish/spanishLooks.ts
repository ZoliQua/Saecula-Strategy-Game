import type { UnitType } from '../../../../types';
import type { UnitLook } from '../looks';
import { M } from '../materials';
import { SPANISH_M } from './spanishMaterials';

const S = SPANISH_M;

/**
 * Spanish unit looks (M5), overriding the base look type by type. Same
 * rigs, poses and stats; red, gold and dark red liveries and one
 * silhouette cue per age: the Iberian warrior's small round caetra and
 * forward-curved falcata under a crested bronze helm (age 1), the
 * heart-shaped adarga bearing the castle of Castile on the knight and
 * the pikeman (age 2), the crested morion of the tercio's pikemen and
 * musketeers and the dragoon's plumed chambergo (age 3). Team colour
 * stays on the tunics, doublets, coats and shield faces, so ownership
 * reads first; the civ's reds are a near-black wine on the legs and a
 * small dark crest only, never a team-like red. The conquistador (M8,
 * in the cavalry's slot) wears the plumed gilt morion and a bright
 * breastplate over team sleeves, carries the cup-hilted espada and
 * rides a dark bay under a full team caparison.
 */
export const SPANISH_LOOKS: Readonly<Partial<Record<UnitType, UnitLook>>> = {
  villager: {
    kind: 'foot',
    human: {
      hat: 'straw',
      body: M.team,
      skirt: { mat: M.team, length: 6 },
      sleeves: M.linen,
      legs: S.wine,
      boots: M.leather,
      belt: S.felt,
      weapon: 'tool',
    },
  },
  swordsman: {
    kind: 'foot',
    human: {
      hat: 'iberianHelm',
      body: M.team,
      skirt: { mat: M.team, length: 7 },
      sleeves: M.team,
      forearms: M.skin,
      legs: S.wool,
      boots: M.leather,
      belt: M.brass,
      weapon: 'gladius',
      weaponStyle: 'falcata',
      shield: 'caetra',
    },
  },
  archer: {
    kind: 'foot',
    human: {
      hat: 'hood',
      body: M.team,
      skirt: { mat: M.team, length: 5.5 },
      sleeves: M.linen,
      legs: S.wine,
      boots: M.boot,
      belt: M.darkLeather,
      back: 'quiver',
      weapon: 'bow',
    },
  },
  pikeman: {
    kind: 'foot',
    human: {
      hat: 'morion',
      body: M.team,
      armour: M.steel,
      skirt: { mat: M.team, length: 6.5 },
      sleeves: M.team,
      legs: S.wine,
      boots: M.boot,
      belt: M.darkLeather,
      weapon: 'pike',
      shield: 'adarga',
    },
  },
  crossbowman: {
    kind: 'foot',
    human: {
      hat: 'kettle',
      body: M.teamQuilted,
      skirt: { mat: M.teamQuilted, length: 6.5 },
      sleeves: M.teamQuilted,
      legs: S.wine,
      boots: M.boot,
      belt: M.leather,
      back: 'bolts',
      weapon: 'crossbow',
    },
  },
  musketeer: {
    kind: 'foot',
    human: {
      hat: 'morion',
      body: M.team,
      skirt: { mat: M.team, length: 9 },
      sleeves: M.team,
      legs: S.wine,
      boots: M.blackBoot,
      highBoots: true,
      belt: M.leather,
      crossBelts: M.leather,
      weapon: 'musket',
    },
  },
  scout: {
    kind: 'rider',
    human: {
      hat: 'iberianHelm',
      body: M.team,
      skirt: { mat: M.team, length: 3.5 },
      sleeves: M.team,
      legs: S.wool,
      boots: M.boot,
      highBoots: true,
      belt: M.leather,
      weapon: 'spear',
      shield: 'caetra',
    },
    horse: { coat: S.dapple, mane: M.horse.mane, saddleCloth: true },
  },
  knight: {
    kind: 'rider',
    human: {
      hat: 'greatHelm',
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
      shield: 'adarga',
    },
    horse: { coat: M.horse.darkBay, mane: M.horse.mane, barding: true },
  },
  cavalry: {
    kind: 'rider',
    human: {
      hat: 'chambergo',
      body: M.team,
      sleeves: M.team,
      legs: S.wool,
      boots: M.blackBoot,
      highBoots: true,
      belt: M.leather,
      crossBelts: M.gold,
      weapon: 'sabre',
    },
    horse: { coat: S.dapple, mane: M.horse.lightMane, saddleCloth: true },
  },
  conquistador: {
    kind: 'rider',
    human: {
      hat: 'plumedMorion',
      body: M.team,
      armour: S.cuirass,
      skirt: { mat: M.team, length: 4.5 },
      sleeves: M.team,
      legs: S.wine,
      boots: S.buffBoot,
      highBoots: true,
      belt: M.darkLeather,
      weapon: 'sabre',
      weaponStyle: 'espada',
    },
    horse: { coat: S.bay, mane: M.horse.mane, barding: true },
  },
  cannon: { kind: 'cannon', barrel: S.barrel },
};
