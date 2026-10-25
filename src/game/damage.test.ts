import { describe, expect, it } from 'vitest';
import {
  BUILDING_BALANCE,
  BUILDING_MELEE_DEF,
  BUILDING_PIERCE_DEF,
  UNIT_BALANCE,
} from '../config/balance';
import type { BuildingType, UnitType } from '../types';
import { bonusVsCavalryFor, computeDamage, type ArmorStats, type AttackStats } from './damage';

const atk = (t: UnitType): AttackStats => ({
  meleeAtk: UNIT_BALANCE[t].meleeAtk,
  pierceAtk: UNIT_BALANCE[t].pierceAtk,
  bonusVsCavalry: bonusVsCavalryFor(t),
});
const def = (t: UnitType): ArmorStats => ({
  melee: UNIT_BALANCE[t].meleeDef,
  pierce: UNIT_BALANCE[t].pierceDef,
});
const BUILDING_DEF: ArmorStats = { melee: BUILDING_MELEE_DEF, pierce: BUILDING_PIERCE_DEF };

describe('computeDamage', () => {
  it('swordsman vs archer = 6 (no melee armour)', () => {
    expect(computeDamage(atk('swordsman'), def('archer'), 'archer')).toBe(6);
  });
  it('archer vs swordsman = 3 (pierce 4 - 1)', () => {
    expect(computeDamage(atk('archer'), def('swordsman'), 'swordsman')).toBe(3);
  });
  it('pikeman vs knight = 26 - melee armour 2 = 24', () => {
    expect(computeDamage(atk('pikeman'), def('knight'), 'knight')).toBe(24);
  });
  it('pikeman vs swordsman gets no cavalry bonus', () => {
    expect(computeDamage(atk('pikeman'), def('swordsman'), 'swordsman')).toBe(4);
  });
  it('pikeman bonus applies to scout and cavalry too', () => {
    expect(computeDamage(atk('pikeman'), def('scout'), 'scout')).toBe(26);
    expect(computeDamage(atk('pikeman'), def('cavalry'), 'cavalry')).toBe(24);
  });
  it('archer vs building = 1 (minimum)', () => {
    expect(computeDamage(atk('archer'), BUILDING_DEF)).toBe(1);
  });
  it('cannon vs building = 34', () => {
    expect(computeDamage(atk('cannon'), BUILDING_DEF)).toBe(34);
  });
  it('melee never drops below 1 against heavy armour', () => {
    expect(computeDamage({ meleeAtk: 3, pierceAtk: 0 }, { melee: 50, pierce: 0 })).toBe(1);
  });
  it('mixed attacker sums both terms', () => {
    expect(computeDamage({ meleeAtk: 5, pierceAtk: 4 }, { melee: 1, pierce: 1 })).toBe(7);
  });
});

describe('balance table sanity', () => {
  it('every unit has positive stats and non-negative costs', () => {
    for (const [t, u] of Object.entries(UNIT_BALANCE)) {
      expect(u.hp, t).toBeGreaterThan(0);
      expect(u.trainTime, t).toBeGreaterThan(0);
      expect(u.trainers.length, t).toBeGreaterThan(0);
      expect(u.meleeAtk + u.pierceAtk, t).toBeGreaterThan(0);
      for (const v of Object.values(u.cost)) expect(v).toBeGreaterThanOrEqual(0);
    }
  });
  it('every building has positive HP/footprint and non-negative costs', () => {
    for (const [t, b] of Object.entries(BUILDING_BALANCE)) {
      expect(b.hp, t).toBeGreaterThan(0);
      expect(b.width * b.height, t).toBeGreaterThan(0);
      for (const v of Object.values(b.cost)) expect(v).toBeGreaterThanOrEqual(0);
    }
  });
  it('unit trainers reference real buildings', () => {
    for (const u of Object.values(UNIT_BALANCE)) {
      for (const tr of u.trainers) expect(tr in BUILDING_BALANCE).toBe(true);
    }
    const foundry: BuildingType = 'foundry';
    expect(UNIT_BALANCE.cannon.trainers).toEqual([foundry]);
  });
});
