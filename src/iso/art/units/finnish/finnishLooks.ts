import type { UnitType } from '../../../../types';
import type { UnitLook } from '../looks';
import { M } from '../materials';
import { FINNISH_M } from './finnishMaterials';

const F = FINNISH_M;

/**
 * Finnish unit looks (M5), overriding the base look type by type. Same
 * rigs, poses and stats; grey homespun legs and one silhouette cue per
 * age: the low team cap on a roll of bear fur, with the round lime-wood
 * shield on the swordsman (age 1); the low conical nasal helm on the
 * pikeman, the crossbowman and the knight, the knight's heater shield
 * bearing the Nordic cross (age 2); the hakkapeliitta's lobster-pot helm
 * on the cavalry and the grey karvalakki with its ear flaps tied up on
 * the musketeer (age 3). Team colour stays on the coats, the cap crowns
 * and the shield fields, so ownership reads first; the civ's blue and
 * white only in the knight's outlined cross. The knight wears no mail
 * over his coat, so the team colour holds on a mounted, steel-limbed
 * figure.
 */
export const FINNISH_LOOKS: Readonly<Partial<Record<UnitType, UnitLook>>> = {
  villager: {
    kind: 'foot',
    human: {
      hat: 'furCap',
      body: M.team,
      skirt: { mat: M.team, length: 6 },
      sleeves: M.linen,
      legs: F.wool,
      boots: M.leather,
      belt: M.leather,
      weapon: 'tool',
    },
  },
  swordsman: {
    kind: 'foot',
    human: {
      hat: 'furCap',
      body: M.team,
      skirt: { mat: M.team, length: 7 },
      sleeves: M.team,
      legs: F.wool,
      boots: M.leather,
      belt: M.darkLeather,
      weapon: 'gladius',
      shield: 'limeShield',
    },
  },
  archer: {
    kind: 'foot',
    human: {
      hat: 'furCap',
      body: M.team,
      skirt: { mat: M.team, length: 5.5 },
      sleeves: M.team,
      legs: F.wool,
      boots: M.boot,
      belt: M.darkLeather,
      back: 'quiver',
      weapon: 'bow',
    },
  },
  pikeman: {
    kind: 'foot',
    human: {
      hat: 'nasalHelm',
      body: M.team,
      armour: M.mail,
      skirt: { mat: M.team, length: 6 },
      sleeves: M.team,
      legs: F.wool,
      boots: M.boot,
      belt: M.darkLeather,
      weapon: 'pike',
    },
  },
  crossbowman: {
    kind: 'foot',
    human: {
      hat: 'nasalHelm',
      body: M.teamQuilted,
      skirt: { mat: M.teamQuilted, length: 6.5 },
      sleeves: M.teamQuilted,
      legs: F.wool,
      boots: M.boot,
      belt: M.leather,
      back: 'bolts',
      weapon: 'crossbow',
    },
  },
  musketeer: {
    kind: 'foot',
    human: {
      hat: 'karvalakki',
      body: M.team,
      skirt: { mat: M.team, length: 10 },
      sleeves: M.team,
      legs: F.wool,
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
      hat: 'furCap',
      body: M.team,
      skirt: { mat: M.team, length: 4 },
      sleeves: M.team,
      legs: F.wool,
      boots: M.boot,
      highBoots: true,
      belt: M.leather,
      weapon: 'spear',
    },
    horse: { coat: F.chestnut, mane: F.flaxen, saddleCloth: true },
  },
  knight: {
    kind: 'rider',
    human: {
      hat: 'nasalHelm',
      body: M.team,
      skirt: { mat: M.team, length: 6 },
      sleeves: M.mail,
      forearms: M.steel,
      hands: M.darkSteel,
      legs: M.mail,
      boots: M.blackBoot,
      highBoots: true,
      belt: M.darkLeather,
      weapon: 'lance',
      shield: 'crossShield',
    },
    horse: { coat: F.chestnut, mane: F.flaxen, barding: true },
  },
  cavalry: {
    kind: 'rider',
    human: {
      hat: 'lobsterPot',
      body: M.team,
      armour: F.blackIron,
      skirt: { mat: M.team, length: 6 },
      sleeves: M.team,
      legs: M.leather,
      boots: M.blackBoot,
      highBoots: true,
      belt: M.leather,
      crossBelts: M.darkLeather,
      weapon: 'sabre',
    },
    horse: { coat: F.chestnut, mane: F.flaxen, saddleCloth: true },
  },
  cannon: { kind: 'cannon', barrel: F.barrel },
};
