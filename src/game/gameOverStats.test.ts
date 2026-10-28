import { describe, expect, it } from 'vitest';
import { decidedWinner, gameOverRows } from './gameOverStats';
import { createPlayer } from './Player';

describe('gameOverRows', () => {
  it('rows in id order; AIs carry difficulty and personality, human null; winner/defeated/standing outcome (AI 2 won by Wonder)', () => {
    const players = [
      createPlayer({ id: 3, civ: 'english', age: 2, personality: 'turtle', defeated: true }),
      createPlayer({ id: 1, isHuman: true, age: 3 }),
      createPlayer({ id: 4, personality: 'boomer' }),
      createPlayer({ id: 2, civ: 'german', age: 3, personality: 'rusher' }),
    ];
    const winner = decidedWinner({ kind: 'defeat', winnerId: 2, cause: 'wonder' }, players);
    expect(winner).toBe(2);
    const rows = gameOverRows(players, winner, 'master');
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

  it('human defeated by conquest with two AIs alive: nobody is the winner, both stand', () => {
    const players = [
      createPlayer({ id: 1, isHuman: true, defeated: true }),
      createPlayer({ id: 2, personality: 'rusher' }),
      createPlayer({ id: 3, personality: 'boomer' }),
    ];
    // VictoryChecker reports the first AI standing; the table must not crown it.
    const winner = decidedWinner({ kind: 'defeat', winnerId: 2, cause: 'conquest' }, players);
    expect(winner).toBeNull();
    expect(gameOverRows(players, winner, 'master').map((r) => r.outcome)).toEqual(['defeated', 'standing', 'standing']);
  });

  it('a conquest is decided when one player is left, and a human victory always', () => {
    const lastAi = [createPlayer({ id: 1, isHuman: true, defeated: true }), createPlayer({ id: 2 }), createPlayer({ id: 3, defeated: true })];
    expect(decidedWinner({ kind: 'defeat', winnerId: 2, cause: 'conquest' }, lastAi)).toBe(2);
    const human = [createPlayer({ id: 1, isHuman: true }), createPlayer({ id: 2, defeated: true })];
    expect(decidedWinner({ kind: 'victory', winnerId: 1, cause: 'conquest' }, human)).toBe(1);
    // A human Wonder win leaves AIs standing.
    const wonder = [createPlayer({ id: 1, isHuman: true }), createPlayer({ id: 2 })];
    expect(decidedWinner({ kind: 'victory', winnerId: 1, cause: 'wonder' }, wonder)).toBe(1);
  });
});
