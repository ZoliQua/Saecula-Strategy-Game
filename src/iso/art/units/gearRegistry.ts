import { BASE_BACK_ITEMS, BASE_HATS, BASE_SHIELDS } from './baseGear';
import { ENGLISH_HATS, ENGLISH_SHIELDS, ENGLISH_WEAPON_STYLES } from './english/englishGear';
import { FRENCH_HATS, FRENCH_SHIELDS } from './french/frenchGear';
import { GERMAN_HATS, GERMAN_SHIELDS } from './german/germanGear';
import { ITALIAN_BACK_ITEMS, ITALIAN_HATS, ITALIAN_SHIELDS } from './italian/italianGear';
import { RUSSIAN_BACK_ITEMS, RUSSIAN_HATS, RUSSIAN_SHIELDS } from './russian/russianGear';
import { SPANISH_HATS, SPANISH_SHIELDS, SPANISH_WEAPON_STYLES } from './spanish/spanishGear';
import type { BackItemPainter, HatDef, ShieldPainter, WeaponStyleDef } from './gear';

/*
 * Unit gear by id (M4 review I4): hats, shields, back items and weapon
 * styles. The shared painters in gear.ts only look ids up here, so a
 * civ adds its gear with one spread per map (from units/<civ>/<civ>Gear.ts)
 * and never edits gear.ts. Ids are global: a civ's ids must not reuse
 * another's (a later spread would silently replace the earlier painter).
 */

export const HATS = { ...BASE_HATS, ...ENGLISH_HATS, ...GERMAN_HATS, ...FRENCH_HATS, ...SPANISH_HATS, ...ITALIAN_HATS, ...RUSSIAN_HATS } satisfies Record<string, HatDef>;
export const SHIELDS = { ...BASE_SHIELDS, ...ENGLISH_SHIELDS, ...GERMAN_SHIELDS, ...FRENCH_SHIELDS, ...SPANISH_SHIELDS, ...ITALIAN_SHIELDS, ...RUSSIAN_SHIELDS } satisfies Record<string, ShieldPainter>;
export const BACK_ITEMS = { ...BASE_BACK_ITEMS, ...ITALIAN_BACK_ITEMS, ...RUSSIAN_BACK_ITEMS } satisfies Record<string, BackItemPainter>;
/** Visual variants of a weapon kind, posed like it (the base has none: each kind's own look). */
export const WEAPON_STYLES = { ...ENGLISH_WEAPON_STYLES, ...SPANISH_WEAPON_STYLES } satisfies Record<string, WeaponStyleDef>;

export type HatKind = keyof typeof HATS;
export type ShieldKind = keyof typeof SHIELDS;
export type BackItem = keyof typeof BACK_ITEMS;
export type WeaponStyle = keyof typeof WEAPON_STYLES;
