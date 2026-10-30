import type { UnitType } from '../../../../types';
import type { UnitLook } from '../looks';
import { M } from '../materials';
import { FRENCH_M } from './frenchMaterials';

const F = FRENCH_M;

/**
 * French unit looks (M5), overriding the base look type by type. Same
 * rigs, poses and stats; blue, gold and white liveries and one
 * silhouette cue per age: the Gaulish wheel-crested helm and long body
 * shield (age 1), the snouted hounskull bascinet of the pikeman and the
 * knight, who carries the fleur-de-lis shield (age 2), the bicorne of
 * the musketeer and the cuirassier's crested helm with its black mane
 * (age 3). Team colour stays on the tunics, coats, surcoats, hoods and
 * shield faces, so ownership reads first; the civ's blue is a dark navy
 * on the legs only, never a team-like blue. The King's Musketeer (M8,
 * in the musketeer's slot) wears the plumed cavalier hat, the team
 * casaque with its white cross and the bandolier.
 */
export const FRENCH_LOOKS: Readonly<Partial<Record<UnitType, UnitLook>>> = {
  villager: {
    kind: 'foot',
    human: {
      hat: 'cap',
      body: M.team,
      skirt: { mat: M.team, length: 5.5 },
      sleeves: M.linen,
      legs: F.navy,
      boots: M.boot,
      belt: M.leather,
      weapon: 'tool',
    },
  },
  swordsman: {
    kind: 'foot',
    human: {
      hat: 'wheelHelm',
      body: M.team,
      skirt: { mat: M.team, length: 6 },
      sleeves: M.team,
      forearms: M.skin,
      legs: F.braccae,
      boots: M.leather,
      belt: M.brass,
      weapon: 'gladius',
      shield: 'gaulShield',
    },
  },
  archer: {
    kind: 'foot',
    human: {
      hat: 'hood',
      body: M.team,
      skirt: { mat: M.team, length: 5 },
      sleeves: M.linen,
      legs: F.braccae,
      boots: M.boot,
      belt: M.darkLeather,
      back: 'quiver',
      weapon: 'bow',
    },
  },
  pikeman: {
    kind: 'foot',
    human: {
      hat: 'hounskull',
      body: M.team,
      skirt: { mat: M.team, length: 6.5 },
      sleeves: M.team,
      forearms: M.mail,
      legs: F.navy,
      boots: M.boot,
      belt: M.darkLeather,
      weapon: 'pike',
    },
  },
  crossbowman: {
    kind: 'foot',
    human: {
      hat: 'coif',
      body: M.teamQuilted,
      skirt: { mat: M.teamQuilted, length: 6.5 },
      sleeves: M.teamQuilted,
      legs: F.navy,
      boots: M.boot,
      belt: M.leather,
      back: 'bolts',
      weapon: 'crossbow',
    },
  },
  musketeer: {
    kind: 'foot',
    human: {
      hat: 'bicorne',
      body: M.team,
      skirt: { mat: M.team, length: 10 },
      sleeves: M.team,
      legs: F.white,
      boots: M.blackBoot,
      highBoots: true,
      belt: F.white,
      crossBelts: F.white,
      weapon: 'musket',
    },
  },
  mousquetaire: {
    kind: 'foot',
    human: {
      hat: 'cavalier',
      body: F.casaque,
      skirt: { mat: M.team, length: 8.5 },
      sleeves: M.team,
      legs: F.navy,
      boots: M.leather,
      highBoots: true,
      belt: M.darkLeather,
      back: 'bandolier',
      weapon: 'musket',
    },
  },
  scout: {
    kind: 'rider',
    human: {
      hat: 'wheelHelm',
      body: M.team,
      skirt: { mat: M.team, length: 3.5 },
      sleeves: M.team,
      legs: F.braccae,
      boots: M.boot,
      highBoots: true,
      belt: M.leather,
      weapon: 'spear',
    },
    horse: { coat: F.chestnut, mane: M.horse.mane, saddleCloth: true },
  },
  knight: {
    kind: 'rider',
    human: {
      hat: 'hounskull',
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
      shield: 'fleurShield',
    },
    horse: { coat: M.horse.grey, mane: M.horse.lightMane, barding: true },
  },
  cavalry: {
    kind: 'rider',
    human: {
      hat: 'crestedHelm',
      body: M.team,
      sleeves: M.team,
      legs: F.white,
      boots: M.blackBoot,
      highBoots: true,
      belt: F.white,
      crossBelts: F.white,
      weapon: 'sabre',
    },
    horse: { coat: F.chestnut, mane: M.horse.mane, saddleCloth: true },
  },
  cannon: { kind: 'cannon', barrel: F.barrel },
};
