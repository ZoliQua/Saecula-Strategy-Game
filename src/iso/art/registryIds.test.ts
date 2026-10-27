import { describe, expect, it } from 'vitest';
import { BASE_CHARGES, CHARGES } from './architecture/charges';
import { ENGLISH_CHARGES } from './architecture/english/englishCharge';
import { BASE_BACK_ITEMS, BASE_HATS, BASE_SHIELDS } from './units/baseGear';
import { ENGLISH_HATS, ENGLISH_SHIELDS, ENGLISH_WEAPON_STYLES } from './units/english/englishGear';
import { BACK_ITEMS, HATS, SHIELDS, WEAPON_STYLES } from './units/gearRegistry';

/*
 * Registry ids are global: a civ's spread must not reuse an id of the
 * base or of another civ, or it would silently replace that painter.
 * Each civ adds its maps to the source lists below (one line per map).
 */

const REGISTRIES: Array<[string, object, readonly object[]]> = [
  ['HATS', HATS, [BASE_HATS, ENGLISH_HATS]],
  ['SHIELDS', SHIELDS, [BASE_SHIELDS, ENGLISH_SHIELDS]],
  ['BACK_ITEMS', BACK_ITEMS, [BASE_BACK_ITEMS]],
  ['WEAPON_STYLES', WEAPON_STYLES, [ENGLISH_WEAPON_STYLES]],
  ['CHARGES', CHARGES, [BASE_CHARGES, ENGLISH_CHARGES]],
];

describe('art registry ids', () => {
  it.each(REGISTRIES)('%s: every source map has its own ids, and all of them are registered', (_name, registry, sources) => {
    const ids = sources.flatMap((m) => Object.keys(m));
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
    expect(Object.keys(registry).sort()).toEqual([...ids].sort());
  });
});
