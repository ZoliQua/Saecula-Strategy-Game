import { describe, expect, it } from 'vitest';
import {
  ANTI_CAVALRY_UNITS,
  ARROW_UNITS,
  CAVALRY_CLASS,
  INFANTRY_CLASS,
  UNIT_BALANCE,
  UNIT_PROJECTILE,
} from './balance';
import { baseUnitType, isUniqueUnit } from '../game/civUnits';
import type { UnitType } from '../types';

describe('unique unit rows', () => {
  const uniques = (Object.keys(UNIT_BALANCE) as UnitType[]).filter(isUniqueUnit);

  it('has the 8 unique rows', () => {
    expect(uniques).toHaveLength(8);
  });

  it("unique unit belongs to its base unit's classes", () => {
    for (const u of uniques) {
      const b = baseUnitType(u);
      for (const list of [CAVALRY_CLASS, INFANTRY_CLASS, ARROW_UNITS, ANTI_CAVALRY_UNITS]) {
        expect(list.includes(u), `${u} in class of ${b}`).toBe(list.includes(b));
      }
      expect(UNIT_BALANCE[u].age).toBe(UNIT_BALANCE[b].age);
      expect(UNIT_BALANCE[u].trainers).toEqual(UNIT_BALANCE[b].trainers);
      expect(UNIT_BALANCE[u].replaces).toBe(b);
      expect(u in UNIT_PROJECTILE).toBe(b in UNIT_PROJECTILE);
    }
  });

  it('marks only unique rows as replacing', () => {
    for (const t of Object.keys(UNIT_BALANCE) as UnitType[]) {
      expect(UNIT_BALANCE[t].replaces !== undefined).toBe(isUniqueUnit(t));
    }
  });
});
