import { describe, expect, it } from 'vitest';
import { createPlayer } from '../../game/Player';
import { PlayerManager } from '../../game/PlayerManager';
import { DUEL_BUDGET, duel, fairDuel, unitValue } from './unitDuel';

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

  it('applies no civ bonus (a default player would be Hungarian, +10 % cavalry speed)', () => {
    const hungarianVsEnglish = new PlayerManager([
      createPlayer({ id: 1, isHuman: true, civ: 'hungarian' }),
      createPlayer({ id: 2, civ: 'english' }),
    ]);
    // The cavalry speed bonus would move this result: the default duel must not carry it.
    expect(duel('knight', 'crossbowman', DUEL_BUDGET, hungarianVsEnglish)).not.toBe(duel('knight', 'crossbowman'));
    expect(duel('knight', 'crossbowman')).toBe(duel('knight', 'crossbowman', DUEL_BUDGET, null));
  });

  it('fairDuel averages both sides: antisymmetric, a mirror scores 0', () => {
    expect(fairDuel('swordsman', 'swordsman')).toBe(0);
    expect(fairDuel('knight', 'crossbowman')).toBe(-fairDuel('crossbowman', 'knight'));
    expect(fairDuel('pikeman', 'knight')).toBe((duel('pikeman', 'knight') - duel('knight', 'pikeman')) / 2);
  });

  it('is deterministic', () => {
    expect(duel('knight', 'crossbowman')).toBe(duel('knight', 'crossbowman'));
  });
});
