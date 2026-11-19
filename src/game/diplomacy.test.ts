import { describe, expect, it } from 'vitest';
import { areAllies, areEnemies, isFriendly, NO_TEAMS, teamFor } from './diplomacy';
import { createPlayers } from './PlayerManager';

describe('diplomacy (M16)', () => {
  it('teamFor: with allies the human and players 2..1+allies are team 1, the rest team 2; none = own id', () => {
    expect([1, 2, 3, 4].map((id) => teamFor(id, 0))).toEqual([1, 2, 3, 4]);
    expect([1, 2, 3, 4].map((id) => teamFor(id, 1))).toEqual([1, 1, 2, 2]);
    expect([1, 2, 3, 4, 5, 6].map((id) => teamFor(id, 2))).toEqual([1, 1, 1, 2, 2, 2]);
  });

  it('with no allies every pair of players is hostile', () => {
    const players = createPlayers('hungarian', ['english', 'german', 'french']);
    for (const a of [1, 2, 3, 4]) {
      for (const b of [1, 2, 3, 4]) {
        expect(areEnemies(players, a, b)).toBe(a !== b);
        expect(areAllies(players, a, b)).toBe(false);
        expect(isFriendly(players, a, b)).toBe(a === b);
      }
    }
  });

  it('with one ally 1↔2 are allies, 1↔3 and 2↔3 enemies, 3↔4 allies', () => {
    const players = createPlayers('hungarian', ['english', 'german', 'french'], undefined, 1);
    expect(areAllies(players, 1, 2)).toBe(true);
    expect(areEnemies(players, 1, 2)).toBe(false);
    expect(areEnemies(players, 1, 3)).toBe(true);
    expect(areEnemies(players, 2, 3)).toBe(true);
    expect(areAllies(players, 3, 4)).toBe(true);
    expect(isFriendly(players, 2, 1)).toBe(true);
    expect(isFriendly(players, 4, 1)).toBe(false);
  });

  it('a player is neither its own ally nor enemy', () => {
    const players = createPlayers('hungarian', ['english'], undefined, 0);
    expect(areAllies(players, 1, 1)).toBe(false);
    expect(areEnemies(players, 1, 1)).toBe(false);
  });

  it('Gaia (0) is nobody\'s ally nor enemy, and never friendly to a player', () => {
    const players = createPlayers('hungarian', ['english', 'german'], undefined, 1);
    for (const p of [1, 2, 3]) {
      expect(areAllies(players, 0, p)).toBe(false);
      expect(areEnemies(players, 0, p)).toBe(false);
      expect(isFriendly(players, 0, p)).toBe(false);
      expect(isFriendly(players, p, 0)).toBe(false);
    }
    expect(areAllies(NO_TEAMS, 0, 0)).toBe(false);
  });

  it('the player manager answers teamOf, unknown ids (Gaia) being their own team', () => {
    const players = createPlayers('hungarian', ['english', 'german'], undefined, 1);
    expect(players.all().map((p) => p.team)).toEqual([1, 1, 2]);
    expect(players.teamOf(3)).toBe(2);
    expect(players.teamOf(0)).toBe(0);
    players.assignTeams(0);
    expect([1, 2, 3].map((id) => players.teamOf(id))).toEqual([1, 2, 3]);
  });
});
