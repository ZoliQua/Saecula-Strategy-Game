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

  it('offers the easy and medium AI', () => {
    expect(withSetup(defaultSetupConfig(1), { difficulty: 'medium' }).difficulty).toBe('medium');
  });

  it('falls back from options that are not implemented yet', () => {
    const c = withSetup(defaultSetupConfig(1), { difficulty: 'hard', civ: 'finnish' });
    expect(c.difficulty).toBe('easy');
    expect(c.civ).toBe('hungarian');
  });

  it('falls back to meadow for templates that are not generated yet', () => {
    for (const template of ['wilderness', 'islands', 'fortress', 'random'] as const) {
      expect(withSetup(defaultSetupConfig(1), { template }).template).toBe('meadow');
    }
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
