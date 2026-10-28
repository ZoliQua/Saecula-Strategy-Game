import { CIV_DEFS, type UnitLookId } from '../../../config/civs';
import type { CivId, UnitType } from '../../../types';
import { ENGLISH_LOOKS } from './english/englishLooks';
import { FRENCH_LOOKS } from './french/frenchLooks';
import { GERMAN_LOOKS } from './german/germanLooks';
import type { HorseLook } from './horse';
import type { HumanLook } from './humanoid';
import { M, type Material } from './materials';
import type { ContactShadow } from './raster';

export type UnitLook =
  | { readonly kind: 'foot'; readonly human: HumanLook }
  | { readonly kind: 'rider'; readonly human: HumanLook; readonly horse: HorseLook }
  /** `barrel` defaults to bronze. */
  | { readonly kind: 'cannon'; readonly barrel?: Material };

/**
 * What every unit wears and carries: the shared base look (the
 * Hungarian look), which a civ's override map replaces type by type.
 * Team colour (M.team) goes where it reads best at a glance: tunics,
 * coats, shields, hoods, caparisons.
 */
export const BASE_UNIT_LOOKS: Readonly<Record<UnitType, UnitLook>> = {
  villager: {
    kind: 'foot',
    human: {
      hat: 'straw',
      body: M.team,
      skirt: { mat: M.team, length: 5 },
      sleeves: M.linen,
      legs: M.trousers.brown,
      boots: M.boot,
      belt: M.leather,
      weapon: 'tool',
    },
  },
  swordsman: {
    kind: 'foot',
    human: {
      hat: 'galea',
      body: M.team,
      armour: M.lorica,
      pauldrons: M.lorica,
      skirt: { mat: M.team, length: 6 },
      sleeves: M.team,
      forearms: M.skin,
      legs: M.skin,
      boots: M.leather,
      belt: M.darkLeather,
      weapon: 'gladius',
      shield: 'scutum',
    },
  },
  archer: {
    kind: 'foot',
    human: {
      hat: 'hood',
      body: M.team,
      skirt: { mat: M.team, length: 4.5 },
      sleeves: M.leather,
      legs: M.trousers.olive,
      boots: M.boot,
      belt: M.darkLeather,
      back: 'quiver',
      weapon: 'bow',
    },
  },
  pikeman: {
    kind: 'foot',
    human: {
      hat: 'kettle',
      body: M.team,
      armour: M.steel,
      skirt: { mat: M.team, length: 5.5 },
      sleeves: M.team,
      legs: M.trousers.leather,
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
      skirt: { mat: M.teamQuilted, length: 6 },
      sleeves: M.teamQuilted,
      legs: M.trousers.grey,
      boots: M.boot,
      belt: M.leather,
      back: 'bolts',
      weapon: 'crossbow',
    },
  },
  musketeer: {
    kind: 'foot',
    human: {
      hat: 'tricorne',
      body: M.team,
      skirt: { mat: M.team, length: 9.5 },
      sleeves: M.team,
      legs: M.white,
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
      hat: 'cap',
      body: M.team,
      skirt: { mat: M.team, length: 3.5 },
      sleeves: M.leather,
      legs: M.trousers.brown,
      boots: M.boot,
      highBoots: true,
      belt: M.leather,
      weapon: 'spear',
    },
    horse: { coat: M.horse.bay, mane: M.horse.mane, saddleCloth: true },
  },
  knight: {
    kind: 'rider',
    human: {
      hat: 'greatHelm',
      body: M.team,
      armour: M.steel,
      pauldrons: M.steel,
      skirt: { mat: M.team, length: 5 },
      sleeves: M.mail,
      forearms: M.steel,
      hands: M.darkSteel,
      legs: M.mail,
      boots: M.steel,
      highBoots: true,
      belt: M.darkLeather,
      weapon: 'lance',
      shield: 'heater',
    },
    horse: { coat: M.horse.grey, mane: M.horse.lightMane, barding: true },
  },
  cavalry: {
    kind: 'rider',
    human: {
      hat: 'shako',
      body: { color: 0xffffff, team: true, bands: { count: 5, color: 0xe8c35a, width: 0.08 } },
      sleeves: M.team,
      legs: M.white,
      boots: M.blackBoot,
      highBoots: true,
      belt: M.white,
      crossBelts: M.white,
      weapon: 'sabre',
    },
    horse: { coat: M.horse.darkBay, mane: M.horse.mane, saddleCloth: true },
  },
  cannon: { kind: 'cannon' },
};

/** Per unit-look id: the types whose look differs from the base. */
const LOOK_OVERRIDES: Readonly<Record<UnitLookId, Readonly<Partial<Record<UnitType, UnitLook>>>>> = {
  hungarian: {},
  english: ENGLISH_LOOKS,
  german: GERMAN_LOOKS,
  french: FRENCH_LOOKS,
};

/** The look a civ's units of a type wear (civ registry unitLook → override, else the base look). */
export function unitLook(type: UnitType, civ: CivId): UnitLook {
  return LOOK_OVERRIDES[CIV_DEFS[civ].unitLook][type] ?? BASE_UNIT_LOOKS[type];
}

export function contactShadow(look: UnitLook): ContactShadow {
  return look.kind === 'foot' ? { rx: 12.5, ry: 5.8, alpha: 0.4 } : { rx: 23, ry: 10, alpha: 0.38 };
}
