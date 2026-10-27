import { describe, expect, it } from 'vitest';
import { TECH_SPECS } from './technologies';
import { effectiveUnitStats, gatherMultiplier, houseBonus, scaleHealth, unitBonuses } from './modifiers';
import { createPlayer } from './Player';
import type { TechId } from '../types';

const having = (...techs: TechId[]) => createPlayer({ id: 1, researched: new Set(techs) });

describe('modifiers', () => {
  it('changes nothing without technologies', () => {
    const p = having();
    expect(effectiveUnitStats(p, 'swordsman')).toMatchObject({ meleeAtk: 6, pierceDef: 1, speedMultiplier: 1 });
    expect(gatherMultiplier(p, 'wood')).toBe(1);
    expect(houseBonus(p)).toBe(0);
  });

  it('blade sharpening adds melee attack to melee units except villagers and archers', () => {
    const p = having('blade_sharpening_1');
    expect(effectiveUnitStats(p, 'swordsman').meleeAtk).toBe(7);
    expect(effectiveUnitStats(p, 'knight').meleeAtk).toBe(11);
    expect(effectiveUnitStats(p, 'villager').meleeAtk).toBe(3);
    expect(effectiveUnitStats(p, 'archer').meleeAtk).toBe(0);
  });

  it('attack bonuses stack additively across levels', () => {
    expect(effectiveUnitStats(having('blade_sharpening_1', 'blade_sharpening_2'), 'swordsman').meleeAtk).toBe(8);
  });

  it('arrow sharpening only affects archer, crossbowman and musketeer', () => {
    const p = having('arrow_sharpening_1');
    expect(effectiveUnitStats(p, 'archer').pierceAtk).toBe(5);
    expect(effectiveUnitStats(p, 'crossbowman').pierceAtk).toBe(6);
    expect(effectiveUnitStats(p, 'musketeer').pierceAtk).toBe(8);
    expect(effectiveUnitStats(p, 'cannon').pierceAtk).toBe(40);
    expect(effectiveUnitStats(p, 'swordsman').pierceAtk).toBe(0);
  });

  it('armour and shield techs raise melee and pierce defence', () => {
    const p = having('armor_1', 'armor_2', 'shield_1');
    expect(effectiveUnitStats(p, 'swordsman')).toMatchObject({ meleeDef: 2, pierceDef: 2 });
  });

  it('infantry march speeds up infantry only', () => {
    const p = having('infantry_march');
    expect(effectiveUnitStats(p, 'pikeman').speedMultiplier).toBeCloseTo(1.1);
    expect(effectiveUnitStats(p, 'knight').speedMultiplier).toBe(1);
    expect(effectiveUnitStats(p, 'villager').speedMultiplier).toBe(1);
  });

  it('cavalry training raises cavalry-class HP only', () => {
    const p = having('cavalry_training');
    expect(effectiveUnitStats(p, 'knight').hp).toBe(110);
    expect(effectiveUnitStats(p, 'scout').hp).toBe(50);
    expect(effectiveUnitStats(p, 'cavalry').hp).toBe(132);
    expect(effectiveUnitStats(p, 'swordsman').hp).toBe(40);
  });

  it('gather bonuses stack multiplicatively and per resource', () => {
    const p = having('double_saw', 'two_man_saw', 'steam_saw', 'gold_mining_1');
    expect(gatherMultiplier(p, 'wood')).toBeCloseTo(1.1 * 1.15 * 1.2);
    expect(gatherMultiplier(p, 'gold')).toBeCloseTo(1.15);
    expect(gatherMultiplier(p, 'food')).toBe(1);
    expect(gatherMultiplier(having('crop_rotation', 'heavy_plow'), 'food')).toBeCloseTo(1.15 * 1.15);
  });

  it('artisan guilds give +2 per house', () => {
    expect(houseBonus(having('artisan_guilds'))).toBe(2);
  });

  it('scaleHealth keeps the health ratio', () => {
    const h = { current: 50, max: 100 };
    scaleHealth(h, 1.1);
    expect(h).toEqual({ current: 55, max: 110 });
  });

  it('caches bonuses per player (no allocation per call) and refreshes when a tech is researched', () => {
    const p = having('armor_1');
    const first = unitBonuses(p, 'swordsman');
    expect(unitBonuses(p, 'swordsman')).toBe(first);
    expect(gatherMultiplier(p, 'wood')).toBe(1);
    p.researched.add('armor_2');
    p.researched.add('double_saw');
    expect(unitBonuses(p, 'swordsman')).not.toBe(first);
    expect(unitBonuses(p, 'swordsman').meleeDef).toBe(2);
    expect(gatherMultiplier(p, 'wood')).toBeCloseTo(1.1);
  });

  it('hands out frozen shared bonuses, so no caller can corrupt every unit of a player', () => {
    const b = unitBonuses(having('armor_1'), 'swordsman');
    expect(Object.isFrozen(b)).toBe(true);
    expect(Object.isFrozen(unitBonuses(having(), 'swordsman'))).toBe(true);
  });

  it('keeps separate caches for players with different researched sets', () => {
    const a = having('armor_1');
    const b = having();
    expect(unitBonuses(a, 'swordsman').meleeDef).toBe(1);
    expect(unitBonuses(b, 'swordsman').meleeDef).toBe(0);
  });

  it('every tech is a one-time, well-formed entry with a prerequisite inside the table', () => {
    for (const spec of Object.values(TECH_SPECS)) {
      for (const pre of spec.prerequisites) expect(TECH_SPECS[pre]).toBeDefined();
      expect(spec.time).toBeGreaterThan(0);
    }
    expect(Object.keys(TECH_SPECS)).toHaveLength(22);
  });
});
