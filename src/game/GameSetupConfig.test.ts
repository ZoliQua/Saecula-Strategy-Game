import { describe, expect, it } from 'vitest';
import {
  clampAiCount,
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
