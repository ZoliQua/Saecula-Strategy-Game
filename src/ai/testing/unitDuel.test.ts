import { describe, expect, it } from 'vitest';
import { DUEL_BUDGET, duel, unitValue } from './unitDuel';

describe('unitDuel', () => {
  it('values a unit by its training cost', () => {
    expect(unitValue('cossack')).toBe(100);
  });

  it('lets melee close on ranged in the open arena', () => {
    expect(duel('swordsman', 'archer')).toBeGreaterThan(0);
    expect(duel('archer', 'swordsman')).toBeLessThan(0);
  });

  it('lets pikemen beat knights', () => {
    expect(duel('pikeman', 'knight')).toBeGreaterThan(0);
  });

  it('keeps a mirror match near even', () => {
    expect(Math.abs(duel('swordsman', 'swordsman'))).toBeLessThan(0.15 * DUEL_BUDGET);
  });

  it('is deterministic', () => {
    expect(duel('knight', 'crossbowman')).toBe(duel('knight', 'crossbowman'));
  });
});
