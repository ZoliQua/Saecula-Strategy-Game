import { describe, expect, it } from 'vitest';
import { BASE_CHARGES, CHARGES } from './architecture/charges';
import { ENGLISH_CHARGES } from './architecture/english/englishCharge';
import { FRENCH_CHARGES } from './architecture/french/frenchCharge';
import { GERMAN_CHARGES } from './architecture/german/germanCharge';
import { ITALIAN_CHARGES } from './architecture/italian/italianCharge';
import { SPANISH_CHARGES } from './architecture/spanish/spanishCharge';
import { BASE_BACK_ITEMS, BASE_HATS, BASE_SHIELDS } from './units/baseGear';
import { ENGLISH_HATS, ENGLISH_SHIELDS, ENGLISH_WEAPON_STYLES } from './units/english/englishGear';
import { FRENCH_HATS, FRENCH_SHIELDS } from './units/french/frenchGear';
import { GERMAN_HATS, GERMAN_SHIELDS } from './units/german/germanGear';
import { SPANISH_HATS, SPANISH_SHIELDS, SPANISH_WEAPON_STYLES } from './units/spanish/spanishGear';
import { BACK_ITEMS, HATS, SHIELDS, WEAPON_STYLES } from './units/gearRegistry';

/*
 * Registry ids are global: a civ's spread must not reuse an id of the
 * base or of another civ, or it would silently replace that painter.
 * Each civ adds its maps to the source lists below (one line per map).
 */

const REGISTRIES: Array<[string, object, readonly object[]]> = [
  ['HATS', HATS, [BASE_HATS, ENGLISH_HATS, GERMAN_HATS, FRENCH_HATS, SPANISH_HATS]],
  ['SHIELDS', SHIELDS, [BASE_SHIELDS, ENGLISH_SHIELDS, GERMAN_SHIELDS, FRENCH_SHIELDS, SPANISH_SHIELDS]],
  ['BACK_ITEMS', BACK_ITEMS, [BASE_BACK_ITEMS]],
  ['WEAPON_STYLES', WEAPON_STYLES, [ENGLISH_WEAPON_STYLES, SPANISH_WEAPON_STYLES]],
  ['CHARGES', CHARGES, [BASE_CHARGES, ENGLISH_CHARGES, GERMAN_CHARGES, FRENCH_CHARGES, SPANISH_CHARGES, ITALIAN_CHARGES]],
];

describe('art registry ids', () => {
  it.each(REGISTRIES)('%s: every source map has its own ids, and all of them are registered', (_name, registry, sources) => {
    const ids = sources.flatMap((m) => Object.keys(m));
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
    expect(Object.keys(registry).sort()).toEqual([...ids].sort());
  });
});
