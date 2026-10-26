import { describe, expect, it } from 'vitest';
import {
  isBuildingAvailable,
  isTechAvailable,
  isUnitAvailable,
  techRequiredAge,
  unitRequiredAge,
} from './availability';

describe('availability by age', () => {
  it('gates units by their age', () => {
    expect(isUnitAvailable('swordsman', 1)).toBe(true);
    expect(isUnitAvailable('knight', 1)).toBe(false);
    expect(isUnitAvailable('knight', 2)).toBe(true);
    expect(isUnitAvailable('musketeer', 2)).toBe(false);
    expect(isUnitAvailable('cannon', 3)).toBe(true);
    expect(unitRequiredAge('cavalry')).toBe(3);
  });

  it('gates buildings by their age', () => {
    expect(isBuildingAvailable('barracks', 1)).toBe(true);
    expect(isBuildingAvailable('stable', 1)).toBe(false);
    expect(isBuildingAvailable('stable', 2)).toBe(true);
    expect(isBuildingAvailable('foundry', 2)).toBe(false);
    expect(isBuildingAvailable('wonder', 3)).toBe(true);
  });

  it('gates technologies by age, prerequisites and one-time research', () => {
    const none = new Set<never>();
    expect(isTechAvailable('feudalism', { age: 1, researched: none })).toBe(true);
    expect(isTechAvailable('enlightenment', { age: 1, researched: none })).toBe(false);
    // Age reached but the prerequisite is missing.
    expect(isTechAvailable('enlightenment', { age: 2, researched: none })).toBe(false);
    expect(isTechAvailable('enlightenment', { age: 2, researched: new Set(['feudalism']) })).toBe(true);
    expect(isTechAvailable('feudalism', { age: 2, researched: new Set(['feudalism']) })).toBe(false);
    expect(techRequiredAge('enlightenment')).toBe(2);
  });
});
