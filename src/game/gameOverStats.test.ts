import { describe, expect, it } from 'vitest';
import { gameOverRows } from './gameOverStats';
import { createPlayer } from './Player';

describe('gameOverRows', () => {
  it('rows in id order; AIs carry difficulty and personality, human null; winner/defeated/standing outcome', () => {
    const players = [
      createPlayer({ id: 3, civ: 'english', age: 2, personality: 'turtle', defeated: true }),
      createPlayer({ id: 1, isHuman: true, age: 3 }),
      createPlayer({ id: 4, personality: 'boomer' }),
      createPlayer({ id: 2, civ: 'german', age: 3, personality: 'rusher' }),
    ];
    const rows = gameOverRows(players, 2, 'master');
    expect(rows.map((r) => r.id)).toEqual([1, 2, 3, 4]);
    expect(rows[0]).toEqual({
      id: 1,
      color: players[1]!.color,
      civ: players[1]!.civ,
      isHuman: true,
      difficulty: null,
      personality: null,
      age: 3,
      outcome: 'standing',
    });
    expect(rows.slice(1).map((r) => [r.difficulty, r.personality, r.outcome, r.age, r.civ])).toEqual([
      ['master', 'rusher', 'winner', 3, 'german'],
      ['master', 'turtle', 'defeated', 2, 'english'],
      ['master', 'boomer', 'standing', 1, players[2]!.civ],
    ]);
  });

  it('an AI without a personality (Easy) shows null', () => {
    const rows = gameOverRows([createPlayer({ id: 1, isHuman: true }), createPlayer({ id: 2 })], 1, 'easy');
    expect(rows[1]).toMatchObject({ difficulty: 'easy', personality: null, outcome: 'standing' });
    expect(rows[0]!.outcome).toBe('winner');
  });
});
