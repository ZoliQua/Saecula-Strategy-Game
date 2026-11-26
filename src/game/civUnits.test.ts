import { describe, expect, it } from 'vitest';
import { CIV_DEFS, CIV_IDS } from '../config/civs';
import { BASE_UNIT_TYPES, type UniqueUnitType } from '../types';
import { UNIT_BALANCE } from '../config/balance';
import { baseUnitType, canCivTrain, civUnitType, civUnitTypes, isUniqueUnit } from './civUnits';

describe('civ unit roster', () => {
  it('swaps the replaced slot for the unique unit', () => {
    const roster = civUnitTypes('hungarian');
    expect(roster).toContain('hussar');
    expect(roster).not.toContain('knight');
    // Eleven land units (M11), four ships (M14) and the two traders (M17).
    expect(roster).toHaveLength(17);
    expect(civUnitType('hungarian', 'knight')).toBe('hussar');
    expect(civUnitType('hungarian', 'archer')).toBe('archer');
  });

  it('gives every civ exactly one unique type, its CIV_DEFS one', () => {
    for (const civ of CIV_IDS) {
      const unique = civUnitTypes(civ).filter(isUniqueUnit);
      expect(unique).toEqual([CIV_DEFS[civ].uniqueUnit]);
    }
  });

  it('keeps BASE_UNIT_TYPES order', () => {
    const roster = civUnitTypes('english');
    roster.forEach((t, i) => expect(baseUnitType(t)).toBe(BASE_UNIT_TYPES[i]));
  });

  it('limits training to the civ roster', () => {
    expect(canCivTrain('english', 'longbowman')).toBe(true);
    expect(canCivTrain('hungarian', 'longbowman')).toBe(false);
    expect(canCivTrain('english', 'crossbowman')).toBe(false);
    expect(canCivTrain('english', 'knight')).toBe(true);
  });

  it('has 10 distinct unique units; the M21 two replace slots another civ also replaces', () => {
    const uniques = CIV_IDS.map((c) => CIV_DEFS[c].uniqueUnit);
    expect(new Set(uniques).size).toBe(10);
    const bases = uniques.map((u: UniqueUnitType) => UNIT_BALANCE[u].replaces);
    // The winged hussar replaces the cavalry (as the conquistador does), the janissary the crossbowman (as the longbowman does).
    expect(new Set(bases).size).toBe(8);
    expect(baseUnitType('sissi')).toBe('archer');
    expect(baseUnitType('archer')).toBe('archer');
  });

  it('the Polish winged hussar replaces the cavalry, the Ottoman janissary the crossbowman', () => {
    expect(baseUnitType('winged_hussar')).toBe('cavalry');
    expect(baseUnitType('janissary')).toBe('crossbowman');
    expect(canCivTrain('polish', 'winged_hussar')).toBe(true);
    expect(canCivTrain('polish', 'cavalry')).toBe(false);
    expect(canCivTrain('polish', 'crossbowman')).toBe(true);
    expect(canCivTrain('ottoman', 'janissary')).toBe(true);
    expect(canCivTrain('ottoman', 'crossbowman')).toBe(false);
    expect(canCivTrain('ottoman', 'cavalry')).toBe(true);
    expect(canCivTrain('hungarian', 'winged_hussar')).toBe(false);
    expect(canCivTrain('hungarian', 'janissary')).toBe(false);
  });
});
