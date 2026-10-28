import { describe, expect, it } from 'vitest';
import type { GameOverPlayerRow } from '../../game/gameOverStats';
import { gameOverRowView } from './gameOverView';

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
