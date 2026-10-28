import { describe, expect, it } from 'vitest';
import { createRng } from '../map/random';
import {
  AI_CIV_CHOICES,
  assignCivs,
  civsInPlay,
  clampAiCount,
  matchCivs,
  clampSeed,
  defaultSetupConfig,
  exceedsRecommendedAi,
  mapTiles,
  playerCount,
  randomSeed,
  withSetup,
  type GameSetupConfig,
} from './GameSetupConfig';

describe('GameSetupConfig', () => {
  it('defaults to a medium meadow with 3 easy AIs', () => {
    const c = defaultSetupConfig(42);
    expect(c).toEqual({
      template: 'meadow',
      mapSize: 'medium',
      aiCount: 3,
      difficulty: 'easy',
      civ: 'hungarian',
      aiCivs: 'mixed',
      seed: 42,
    });
    expect(mapTiles(c)).toBe(96);
    expect(playerCount(c)).toBe(4);
  });

  it('maps sizes to the CLAUDE.md tile counts', () => {
    const base = defaultSetupConfig(1);
    expect(mapTiles(withSetup(base, { mapSize: 'small' }))).toBe(64);
    expect(mapTiles(withSetup(base, { mapSize: 'large' }))).toBe(128);
  });

  it('clamps the AI count to 1..5 and rounds', () => {
    expect(clampAiCount(0)).toBe(1);
    expect(clampAiCount(9)).toBe(5);
    expect(clampAiCount(2.6)).toBe(3);
    expect(clampAiCount(Number.NaN)).toBe(1);
  });

  it('clamps and floors the seed', () => {
    expect(clampSeed(-5)).toBe(1);
    expect(clampSeed(12.9)).toBe(12);
    expect(clampSeed(1e12)).toBe(999_999);
    expect(clampSeed(Number.POSITIVE_INFINITY)).toBe(1);
  });

  it('offers all three AI difficulties', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      expect(withSetup(defaultSetupConfig(1), { difficulty }).difficulty).toBe(difficulty);
    }
  });

  it('falls back from options that are not implemented yet', () => {
    const c = withSetup(defaultSetupConfig(1), { civ: 'finnish' });
    expect(c.civ).toBe('hungarian');
  });

  it('keeps an available human civ', () => {
    expect(withSetup(defaultSetupConfig(1), { civ: 'english' }).civ).toBe('english');
  });

  it('falls back to a mixed AI line-up for an unavailable AI civ', () => {
    expect(withSetup(defaultSetupConfig(1), { aiCivs: 'english' }).aiCivs).toBe('english');
    expect(withSetup(defaultSetupConfig(1), { aiCivs: 'russian' }).aiCivs).toBe('mixed');
    const bogus = 'martian' as unknown as GameSetupConfig['aiCivs'];
    expect(withSetup(defaultSetupConfig(1), { aiCivs: bogus }).aiCivs).toBe('mixed');
  });

  it('offers every map template', () => {
    for (const template of ['meadow', 'wilderness', 'islands', 'fortress', 'random'] as const) {
      expect(withSetup(defaultSetupConfig(1), { template }).template).toBe(template);
    }
  });

  it('falls back to meadow for an unknown template', () => {
    const bogus = 'volcano' as unknown as GameSetupConfig['template'];
    expect(withSetup(defaultSetupConfig(1), { template: bogus }).template).toBe('meadow');
  });

  it('allows more AIs than recommended but flags it', () => {
    const small = withSetup(defaultSetupConfig(1), { mapSize: 'small', aiCount: 2 });
    expect(exceedsRecommendedAi(small)).toBe(false);
    const crowded = withSetup(small, { aiCount: 5 });
    expect(crowded.aiCount).toBe(5);
    expect(exceedsRecommendedAi(crowded)).toBe(true);
  });

  it('draws seeds from 1..999999', () => {
    expect(randomSeed(() => 0)).toBe(1);
    expect(randomSeed(() => 0.999999999)).toBe(999_999);
  });
});

describe('AI_CIV_CHOICES', () => {
  it('offers a mix first, then every playable civ (Vegyes / Magyar / Angol / Német / Francia)', () => {
    expect(AI_CIV_CHOICES).toEqual(['mixed', 'hungarian', 'english', 'german', 'french']);
  });

  it('every choice survives withSetup unchanged', () => {
    for (const aiCivs of AI_CIV_CHOICES) {
      expect(withSetup(defaultSetupConfig(5), { aiCivs }).aiCivs).toBe(aiCivs);
    }
  });
});

describe('assignCivs', () => {
  const config = (aiCount: number, aiCivs: GameSetupConfig['aiCivs'], seed = 1): GameSetupConfig =>
    withSetup(defaultSetupConfig(seed), { aiCount, aiCivs });

  it('gives every AI the chosen civ', () => {
    expect(assignCivs(config(4, 'english'), createRng(1))).toEqual(['english', 'english', 'english', 'english']);
    expect(assignCivs(config(2, 'hungarian'), createRng(1))).toEqual(['hungarian', 'hungarian']);
  });

  it('mixed: one civ per AI, distinct while the pool lasts, each available civ once there are enough AIs', () => {
    const pool = ['hungarian', 'english', 'german', 'french'];
    for (let seed = 1; seed <= 200; seed++) {
      for (let ais = 2; ais <= 5; ais++) {
        const civs = assignCivs(config(ais, 'mixed', seed), createRng(seed));
        expect(civs).toHaveLength(ais);
        expect(new Set(civs).size).toBe(Math.min(ais, pool.length));
        for (const civ of civs) expect(pool).toContain(civ);
      }
    }
  });

  it('mixed: 5 AIs over a pool of 6 or more civs get 5 distinct civs', () => {
    const pool = ['hungarian', 'english', 'german', 'french', 'spanish', 'italian', 'russian', 'finnish'] as const;
    for (const size of [6, 7, 8]) {
      for (let seed = 1; seed <= 100; seed++) {
        const civs = assignCivs(config(5, 'mixed', seed), createRng(seed), pool.slice(0, size));
        expect(new Set(civs).size).toBe(5);
        for (const civ of civs) expect(pool.slice(0, size)).toContain(civ);
      }
    }
  });

  it('mixed: a lone AI gets an available civ', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 50; seed++) {
      const civs = assignCivs(config(1, 'mixed', seed), createRng(seed));
      expect(civs).toHaveLength(1);
      seen.add(civs[0]!);
    }
    expect(seen).toEqual(new Set(['hungarian', 'english', 'german', 'french']));
  });

  it('is deterministic per seed', () => {
    const c = config(5, 'mixed', 77);
    expect(assignCivs(c, createRng(9))).toEqual(assignCivs(c, createRng(9)));
    expect(matchCivs(c)).toEqual(matchCivs(c));
    const lineups = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) lineups.add(matchCivs(config(5, 'mixed', seed)).ais.join(','));
    expect(lineups.size).toBeGreaterThan(1);
  });

  it('matchCivs pairs the human civ with the AI line-up; civsInPlay lists each civ once', () => {
    const c = withSetup(defaultSetupConfig(3), { civ: 'english', aiCount: 3, aiCivs: 'english' });
    expect(matchCivs(c)).toEqual({ human: 'english', ais: ['english', 'english', 'english'] });
    expect(civsInPlay(c)).toEqual(['english']);
    expect(civsInPlay(withSetup(c, { aiCivs: 'hungarian' }))).toEqual(['english', 'hungarian']);
  });
});
