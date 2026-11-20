import { describe, expect, it } from 'vitest';
import type { GameOverPlayerRow } from '../../game/gameOverStats';
import { gameOverBody, gameOverRowView } from './gameOverView';
import { hu } from '../../i18n/hu';

const row = (over: Partial<GameOverPlayerRow>): GameOverPlayerRow => ({
  id: 2, color: 0x0a8ad0, civ: 'english', isHuman: false, difficulty: 'master', personality: 'turtle', age: 3, outcome: 'winner', ...over,
});

describe('gameOverRowView', () => {
  it('an AI row shows difficulty · personality, the civ, the age and the outcome', () => {
    expect(gameOverRowView(row({}))).toEqual({
      swatch: '#0a8ad0', civ: 'Angol', who: 'Mesteri · Védekező', age: '3. kor', outcome: 'Győztes', outcomeId: 'winner', isHuman: false,
    });
  });

  it('the human shows "Te"; an Easy AI shows its difficulty only', () => {
    expect(gameOverRowView(row({ isHuman: true, difficulty: null, personality: null, outcome: 'defeated' }))).toMatchObject({ who: 'Te', outcome: 'Legyőzve' });
    expect(gameOverRowView(row({ difficulty: 'easy', personality: null, outcome: 'standing', age: 1 }))).toMatchObject({ who: 'Könnyű', outcome: 'Talpon', age: '1. kor' });
  });
});

describe('gameOverRowView in teams (M16)', () => {
  it('an allied row carries the "Szövetséges" chip; others none', () => {
    expect(gameOverRowView(row({ ally: true })).ally).toBe('Szövetséges');
    expect('ally' in gameOverRowView(row({}))).toBe(false);
  });
});

describe('gameOverBody (M16 team wording)', () => {
  const causes = ['conquest', 'wonder', 'time'] as const;

  it('without teams every cause and outcome keeps its free-for-all line', () => {
    for (const cause of [...causes, 'mission'] as const) {
      for (const victory of [true, false]) {
        const want = hu.gameOver.bodies[cause][victory ? 'victory' : 'defeat'];
        expect(gameOverBody({ victory, cause })).toBe(want);
        expect(gameOverBody({ victory, cause, teams: false })).toBe(want);
      }
    }
  });

  it('with teams every cause and outcome a team match can end in uses the team line', () => {
    for (const cause of causes) {
      for (const victory of [true, false]) {
        const line = gameOverBody({ victory, cause, teams: true });
        expect(line).toBe(hu.gameOver.teamBodies[cause][victory ? 'victory' : 'defeat']);
        expect(line).not.toBe(hu.gameOver.bodies[cause][victory ? 'victory' : 'defeat']);
      }
    }
    expect(gameOverBody({ victory: true, cause: 'wonder', teams: true })).toContain('Csapatod Csodája');
    expect(gameOverBody({ victory: true, cause: 'time', teams: true })).toContain('csapatod összpontszáma');
    expect(gameOverBody({ victory: false, cause: 'time', teams: true })).toContain('ellenséges csapat több pontot');
  });

  it("a mission's closing text wins over any line", () => {
    expect(gameOverBody({ victory: true, cause: 'wonder', teams: true, missionText: 'Kész.' })).toBe('Kész.');
  });
});
