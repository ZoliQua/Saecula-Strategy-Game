import { describe, expect, it } from 'vitest';
import { BASE_CHARGES, CHARGES } from './architecture/charges';
import { ENGLISH_CHARGES } from './architecture/english/englishCharge';
import { FRENCH_CHARGES } from './architecture/french/frenchCharge';
import { GERMAN_CHARGES } from './architecture/german/germanCharge';
import { ITALIAN_CHARGES } from './architecture/italian/italianCharge';
import { RUSSIAN_CHARGES } from './architecture/russian/russianCharge';
import { SPANISH_CHARGES } from './architecture/spanish/spanishCharge';
import { BASE_BACK_ITEMS, BASE_HATS, BASE_SHIELDS } from './units/baseGear';
import { ENGLISH_HATS, ENGLISH_SHIELDS, ENGLISH_WEAPON_STYLES } from './units/english/englishGear';
import { FRENCH_HATS, FRENCH_SHIELDS } from './units/french/frenchGear';
import { GERMAN_HATS, GERMAN_SHIELDS } from './units/german/germanGear';
import { ITALIAN_BACK_ITEMS, ITALIAN_HATS, ITALIAN_SHIELDS } from './units/italian/italianGear';
import { RUSSIAN_BACK_ITEMS, RUSSIAN_HATS, RUSSIAN_SHIELDS } from './units/russian/russianGear';
import { SPANISH_HATS, SPANISH_SHIELDS, SPANISH_WEAPON_STYLES } from './units/spanish/spanishGear';
import { BACK_ITEMS, HATS, SHIELDS, WEAPON_STYLES } from './units/gearRegistry';

/*
 * Registry ids are global: a civ's spread must not reuse an id of the
 * base or of another civ, or it would silently replace that painter.
 * Each civ adds its maps to the source lists below (one line per map).
 */

const REGISTRIES: Array<[string, object, readonly object[]]> = [
  ['HATS', HATS, [BASE_HATS, ENGLISH_HATS, GERMAN_HATS, FRENCH_HATS, SPANISH_HATS, ITALIAN_HATS, RUSSIAN_HATS]],
  ['SHIELDS', SHIELDS, [BASE_SHIELDS, ENGLISH_SHIELDS, GERMAN_SHIELDS, FRENCH_SHIELDS, SPANISH_SHIELDS, ITALIAN_SHIELDS, RUSSIAN_SHIELDS]],
  ['BACK_ITEMS', BACK_ITEMS, [BASE_BACK_ITEMS, ITALIAN_BACK_ITEMS, RUSSIAN_BACK_ITEMS]],
  ['WEAPON_STYLES', WEAPON_STYLES, [ENGLISH_WEAPON_STYLES, SPANISH_WEAPON_STYLES]],
  ['CHARGES', CHARGES, [BASE_CHARGES, ENGLISH_CHARGES, GERMAN_CHARGES, FRENCH_CHARGES, SPANISH_CHARGES, ITALIAN_CHARGES, RUSSIAN_CHARGES]],
];

describe('art registry ids', () => {
  it.each(REGISTRIES)('%s: every source map has its own ids, and all of them are registered', (_name, registry, sources) => {
    const ids = sources.flatMap((m) => Object.keys(m));
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
    expect(Object.keys(registry).sort()).toEqual([...ids].sort());
  });
});
