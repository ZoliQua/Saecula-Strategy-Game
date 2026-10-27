import type { UnitType } from '../../../../types';
import type { UnitLook } from '../looks';
import { M } from '../materials';
import { ENGLISH_M } from './englishMaterials';

const E = ENGLISH_M;

/**
 * English unit looks (M4 design decision 5), overriding the base look
 * type by type. Same rigs, poses and stats; English liveries: undyed
 * wool and madder-red hose, St George's cross on surcoats and heater
 * shields, sallets and kettle hats, the hooded archer's yew longbow, a
 * grenadier mitre, a Tarleton helmet and a cast-iron gun. Team colour
 * stays on the tunics, coats, skirts, hoods, shield rims, caps and
 * caparisons, so ownership still reads first.
 */
export const ENGLISH_LOOKS: Readonly<Partial<Record<UnitType, UnitLook>>> = {
  villager: {
    kind: 'foot',
    human: {
      hat: 'hood',
      body: M.team,
      skirt: { mat: M.team, length: 5 },
      sleeves: E.wool,
      legs: E.greyWool,
      boots: M.boot,
      belt: M.leather,
      weapon: 'tool',
    },
  },
  swordsman: {
    kind: 'foot',
    human: {
      hat: 'sallet',
      body: E.surcoat,
      skirt: { mat: M.team, length: 6.5 },
      sleeves: M.team,
      forearms: M.mail,
      hands: M.darkSteel,
      legs: E.madder,
      boots: M.leather,
      belt: M.darkLeather,
      weapon: 'gladius',
      weaponStyle: 'arming',
      shield: 'stGeorge',
    },
  },
  archer: {
    kind: 'foot',
    human: {
      hat: 'hood',
      body: M.teamQuilted,
      skirt: { mat: M.teamQuilted, length: 5 },
      sleeves: E.wool,
      legs: E.madder,
      boots: M.boot,
      belt: M.darkLeather,
      back: 'quiver',
      weapon: 'bow',
      weaponStyle: 'longbow',
    },
  },
  pikeman: {
    kind: 'foot',
    human: {
      hat: 'sallet',
      body: E.surcoat,
      skirt: { mat: M.team, length: 5.5 },
      sleeves: M.team,
      legs: E.greyWool,
      boots: M.boot,
      belt: M.darkLeather,
      weapon: 'pike',
    },
  },
  crossbowman: {
    kind: 'foot',
    human: {
      hat: 'kettle',
      body: M.teamQuilted,
      skirt: { mat: M.teamQuilted, length: 6 },
      sleeves: M.teamQuilted,
      legs: E.madder,
      boots: M.boot,
      belt: M.leather,
      back: 'bolts',
      weapon: 'crossbow',
    },
  },
  musketeer: {
    kind: 'foot',
    human: {
      hat: 'mitre',
      body: M.team,
      skirt: { mat: M.team, length: 9.5 },
      sleeves: M.team,
      legs: E.wool,
      boots: M.blackBoot,
      highBoots: true,
      belt: M.white,
      crossBelts: M.white,
      weapon: 'musket',
    },
  },
  scout: {
    kind: 'rider',
    human: {
      hat: 'kettle',
      body: M.team,
      skirt: { mat: M.team, length: 3.5 },
      sleeves: M.team,
      legs: E.madder,
      boots: M.boot,
      highBoots: true,
      belt: M.leather,
      weapon: 'spear',
    },
    horse: { coat: E.chestnut, mane: M.horse.mane, saddleCloth: true },
  },
  knight: {
    kind: 'rider',
    human: {
      hat: 'greatHelm',
      body: E.surcoat,
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
      shield: 'stGeorge',
    },
    horse: { coat: M.horse.grey, mane: M.horse.lightMane, barding: true },
  },
  cavalry: {
    kind: 'rider',
    human: {
      hat: 'tarleton',
      body: M.team,
      sleeves: M.team,
      legs: E.wool,
      boots: M.blackBoot,
      highBoots: true,
      belt: M.white,
      crossBelts: M.white,
      weapon: 'sabre',
    },
    horse: { coat: M.horse.bay, mane: M.horse.mane, saddleCloth: true },
  },
  cannon: { kind: 'cannon', barrel: E.ironBarrel },
};
