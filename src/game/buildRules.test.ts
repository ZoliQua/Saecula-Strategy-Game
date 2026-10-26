import { describe, expect, it } from 'vitest';
import { UNIT_BALANCE } from '../config/balance';
import { buildBlocker, countPlayerBuildings } from './buildRules';

describe('buildBlocker', () => {
  it('blocks buildings of a later age', () => {
    expect(buildBlocker('stable', 1, 0)).toBe('age-locked');
    expect(buildBlocker('stable', 2, 0)).toBeNull();
    expect(buildBlocker('foundry', 2, 0)).toBe('age-locked');
    expect(buildBlocker('foundry', 3, 0)).toBeNull();
    expect(buildBlocker('house', 1, 5)).toBeNull();
  });

  it('allows only one wonder per player', () => {
    expect(buildBlocker('wonder', 3, 0)).toBeNull();
    expect(buildBlocker('wonder', 3, 1)).toBe('unique-limit');
    expect(buildBlocker('wonder', 2, 0)).toBe('age-locked');
  });
});

describe('countPlayerBuildings', () => {
  it('counts own, living buildings of the type only', () => {
    const list = [
      { building: { type: 'wonder' as const }, owner: { playerId: 1 } },
      { building: { type: 'wonder' as const }, owner: { playerId: 2 } },
      { building: { type: 'wonder' as const }, owner: { playerId: 1 }, dying: { ttlMs: 0 } },
      { building: { type: 'stable' as const }, owner: { playerId: 1 } },
    ];
    expect(countPlayerBuildings(list, 1, 'wonder')).toBe(1);
  });
});

describe('trainers', () => {
  it('maps units to the specified training buildings', () => {
    expect(UNIT_BALANCE.knight.trainers).toEqual(['stable']);
    expect(UNIT_BALANCE.cavalry.trainers).toEqual(['stable']);
    expect(UNIT_BALANCE.pikeman.trainers).toEqual(['barracks']);
    expect(UNIT_BALANCE.musketeer.trainers).toEqual(['barracks']);
    expect(UNIT_BALANCE.crossbowman.trainers).toEqual(['archery_range']);
    expect(UNIT_BALANCE.cannon.trainers).toEqual(['foundry']);
    expect(UNIT_BALANCE.scout.trainers).toEqual(['barracks']);
    expect(UNIT_BALANCE.swordsman.trainers).toEqual(['barracks']);
    expect([...UNIT_BALANCE.archer.trainers].sort()).toEqual(['archery_range', 'barracks']);
  });
});
