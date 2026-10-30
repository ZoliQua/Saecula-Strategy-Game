import { describe, expect, it } from 'vitest';
import { BUILDING_BALANCE, TECH_BALANCE, UNIT_BALANCE } from '../../config/balance';
import { civUnitTypes } from '../../game/civUnits';
import { TECH_SPECS } from '../../game/technologies';
import type { AgeId, BuildingType, TechId } from '../../types';
import { techTreeModel } from './techTreeModel';

const ALL_BUILDINGS = Object.keys(BUILDING_BALANCE) as BuildingType[];

describe('techTreeModel civ roster', () => {
  const units = (civ: Parameters<typeof techTreeModel>[0]) => techTreeModel(civ, 3).columns.flatMap((c) => c.units);

  it('lists the Russian cossack in place of the scout, marked unique', () => {
    const u = units('russian');
    expect(u.map((x) => x.type)).toContain('cossack');
    expect(u.map((x) => x.type)).not.toContain('scout');
    expect(u.find((x) => x.type === 'cossack')?.unique).toBe(true);
    expect(u.find((x) => x.type === 'villager')?.unique).toBe(false);
  });

  it('lists exactly ten units per civ', () => {
    expect(units('finnish')).toHaveLength(10);
  });
});

describe('techTreeModel', () => {
  const model = techTreeModel('hungarian', 2);

  it('has one column per age, in order', () => {
    expect(model.columns.map((c) => c.age)).toEqual([1, 2, 3]);
    expect(model.civ).toBe('hungarian');
  });

  it('lists every building exactly once, in its unlocking age', () => {
    const seen = model.columns.flatMap((c) => c.buildings.map((b) => ({ type: b.type, age: c.age })));
    expect(seen.map((s) => s.type).sort()).toEqual([...ALL_BUILDINGS].sort());
    for (const s of seen) expect(s.age).toBe(BUILDING_BALANCE[s.type].age);
  });

  it('lists every unit exactly once, in its unlocking age', () => {
    const seen = model.columns.flatMap((c) => c.units.map((u) => ({ type: u.type, age: c.age })));
    expect(seen.map((s) => s.type).sort()).toEqual([...civUnitTypes('hungarian')].sort());
    for (const s of seen) expect(s.age).toBe(UNIT_BALANCE[s.type].age);
  });

  it('names for every unit a trainer that exists in that age or earlier', () => {
    for (const column of model.columns) {
      for (const unit of column.units) {
        expect(UNIT_BALANCE[unit.type].trainers).toContain(unit.trainedAt);
        expect(BUILDING_BALANCE[unit.trainedAt].age).toBeLessThanOrEqual(column.age);
        for (const t of unit.alsoAt) expect(UNIT_BALANCE[unit.type].trainers).toContain(t);
        expect(unit.alsoAt).not.toContain(unit.trainedAt);
      }
    }
  });

  it('groups each column\'s units under their trainer', () => {
    for (const column of model.columns) {
      const grouped = column.trainers.flatMap((g) => g.units.map((u) => ({ trainer: g.building, unit: u.type })));
      expect(grouped.map((g) => g.unit).sort()).toEqual(column.units.map((u) => u.type).sort());
      for (const g of grouped) expect(column.units.find((u) => u.type === g.unit)?.trainedAt).toBe(g.trainer);
      for (const g of column.trainers) expect(g.unlockedIn).toBe(BUILDING_BALANCE[g.building].age);
    }
  });

  it('lists every non-age technology once, in its required age, at its building', () => {
    const seen = model.columns.flatMap((c) => c.techs.map((t) => ({ id: t.id, age: c.age, building: t.building })));
    const expected = (Object.keys(TECH_SPECS) as TechId[]).filter((id) => TECH_SPECS[id].effect.kind !== 'age');
    expect(seen.map((s) => s.id).sort()).toEqual(expected.sort());
    for (const s of seen) {
      expect(s.age).toBe(TECH_SPECS[s.id].requiredAge);
      expect(s.building).toBe(TECH_SPECS[s.id].building);
    }
  });

  it('gives the age-up cost from the balance table for each later age', () => {
    const [first, second, third] = model.columns;
    expect(first?.entry).toBeNull();
    expect(second?.entry).toMatchObject({ tech: 'feudalism', cost: TECH_BALANCE.feudalism.cost, time: TECH_BALANCE.feudalism.time });
    expect(third?.entry).toMatchObject({ tech: 'enlightenment', cost: TECH_BALANCE.enlightenment.cost, time: TECH_BALANCE.enlightenment.time });
  });

  it('carries the balance costs of buildings and units', () => {
    for (const column of model.columns) {
      for (const b of column.buildings) expect(b.cost).toEqual(BUILDING_BALANCE[b.type].cost);
      for (const u of column.units) expect(u.cost).toEqual(UNIT_BALANCE[u.type].cost);
    }
  });

  it.each([1, 2, 3] as AgeId[])('flags age %i as current and the others as past or locked', (age) => {
    const m = techTreeModel('english', age);
    expect(m.currentAge).toBe(age);
    for (const column of m.columns) {
      const expected = column.age === age ? 'current' : column.age < age ? 'past' : 'locked';
      expect(column.state).toBe(expected);
    }
    expect(m.columns.filter((c) => c.state === 'current')).toHaveLength(1);
  });

  it('marks researched technologies', () => {
    const m = techTreeModel('hungarian', 2, new Set<TechId>(['double_saw']));
    const techs = m.columns.flatMap((c) => c.techs);
    expect(techs.find((t) => t.id === 'double_saw')?.researched).toBe(true);
    expect(techs.find((t) => t.id === 'gold_mining_1')?.researched).toBe(false);
  });
});
