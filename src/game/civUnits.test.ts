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
    expect(roster).toHaveLength(10);
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

  it('has 8 distinct unique units replacing 8 distinct base types', () => {
    const uniques = CIV_IDS.map((c) => CIV_DEFS[c].uniqueUnit);
    expect(new Set(uniques).size).toBe(8);
    const bases = uniques.map((u: UniqueUnitType) => UNIT_BALANCE[u].replaces);
    expect(new Set(bases).size).toBe(8);
    expect(baseUnitType('sissi')).toBe('archer');
    expect(baseUnitType('archer')).toBe('archer');
  });
});
