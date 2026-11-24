import { describe, expect, it } from 'vitest';
import { BUILDABLE_BY_VILLAGER, missingResource } from './CommandPanel';
import { techTreeModel } from '../screens/techTreeModel';
import { buildingName } from '../buildingText';

describe('missingResource', () => {
  it('returns null when everything is affordable', () => {
    expect(missingResource({ food: 50, wood: 50, gold: 0 }, { food: 50, wood: 0, gold: 0 })).toBeNull();
  });

  it('reports the first missing resource', () => {
    expect(missingResource({ food: 10, wood: 0, gold: 0 }, { food: 0, wood: 30, gold: 0 })).toBe('wood');
    expect(missingResource({ food: 0, wood: 0, gold: 0 }, { food: 5, wood: 5, gold: 5 })).toBe('food');
  });
});

describe('the market (M17)', () => {
  it('is in the villager build menu and in the tech tree at age 2', () => {
    expect(BUILDABLE_BY_VILLAGER).toContain('market');
    const age2 = techTreeModel('hungarian', 2).columns.find((c) => c.age === 2);
    expect(age2?.buildings.map((b) => b.type)).toContain('market');
  });
});

describe('the landmark (M17)', () => {
  it('is in the villager build menu and, once, in the tech tree at age 2 (the human’s own, named after its civ)', () => {
    expect(BUILDABLE_BY_VILLAGER).toContain('landmark');
    const model = techTreeModel('finnish', 2);
    const age2 = model.columns.find((c) => c.age === 2);
    expect(age2?.buildings.filter((b) => b.type === 'landmark')).toHaveLength(1);
    expect(model.civ).toBe('finnish');
    expect(buildingName('landmark', model.civ)).toBe('Szauna');
  });
});
