import { describe, expect, it } from 'vitest';
import { createRng } from '../map/random';
import {
  AI_CIV_CHOICES,
  AVAILABLE_CIVS,
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
  startResourcesFor,
  VICTORY_MODES,
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
      victory: 'conquest_wonder',
      allies: 0,
      treatyMin: 0,
      startResources: 'normal',
      speed: 1,
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

  it('default victory is conquest_wonder', () => {
    expect(defaultSetupConfig(1).victory).toBe('conquest_wonder');
    expect(VICTORY_MODES).toEqual(['conquest', 'conquest_wonder', 'conquest_time', 'all']);
    expect(withSetup(defaultSetupConfig(1), { victory: 'all' }).victory).toBe('all');
    expect(withSetup(defaultSetupConfig(1), { victory: 'conquest' }).victory).toBe('conquest');
  });

  it('unknown victory falls back', () => {
    const bad = { victory: 'time_only' } as unknown as Partial<GameSetupConfig>;
    expect(withSetup(defaultSetupConfig(1), bad).victory).toBe('conquest_wonder');
    expect(withSetup(withSetup(defaultSetupConfig(1), { victory: 'conquest' }), bad).victory).toBe('conquest_wonder');
  });

  it('offers all three AI difficulties', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      expect(withSetup(defaultSetupConfig(1), { difficulty }).difficulty).toBe(difficulty);
    }
  });

  it('falls back from an unknown human civ', () => {
    const bogus = 'martian' as unknown as GameSetupConfig['civ'];
    expect(withSetup(defaultSetupConfig(1), { civ: bogus }).civ).toBe('hungarian');
  });

  it('keeps every human civ (all eight are playable)', () => {
    for (const civ of AVAILABLE_CIVS) expect(withSetup(defaultSetupConfig(1), { civ }).civ).toBe(civ);
    expect(AVAILABLE_CIVS).toHaveLength(8);
  });

  it('falls back to a mixed AI line-up for an unknown AI civ', () => {
    expect(withSetup(defaultSetupConfig(1), { aiCivs: 'english' }).aiCivs).toBe('english');
    expect(withSetup(defaultSetupConfig(1), { aiCivs: 'finnish' }).aiCivs).toBe('finnish');
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
  it('offers a mix first, then every civ: 9 options (Vegyes / Magyar / Angol / Német / Francia / Spanyol / Olasz / Orosz / Finn)', () => {
    expect(AI_CIV_CHOICES).toEqual(['mixed', 'hungarian', 'english', 'german', 'french', 'spanish', 'italian', 'russian', 'finnish']);
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
    const pool = ['hungarian', 'english', 'german', 'french', 'spanish', 'italian', 'russian', 'finnish'];
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
    expect(seen).toEqual(new Set(['hungarian', 'english', 'german', 'french', 'spanish', 'italian', 'russian', 'finnish']));
  });

  it('mixed (default Vegyes): 5 AIs over the full 8-civ pool get 5 distinct civs, and every civ is dealt over the seeds', () => {
    expect(defaultSetupConfig(1).aiCivs).toBe('mixed');
    const dealt = new Set<string>();
    for (let seed = 1; seed <= 100; seed++) {
      const civs = assignCivs(config(5, 'mixed', seed), createRng(seed));
      expect(new Set(civs).size).toBe(5);
      for (const civ of civs) dealt.add(civ);
    }
    expect(dealt).toEqual(new Set(AVAILABLE_CIVS));
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

  describe('M16 modes', () => {
    it('clamps allies to 0..aiCount - 1 and re-clamps when the AI count drops', () => {
      const base = withSetup(defaultSetupConfig(1), { aiCount: 4 });
      expect(withSetup(base, { allies: 2 }).allies).toBe(2);
      expect(withSetup(base, { allies: 9 }).allies).toBe(3);
      expect(withSetup(base, { allies: -2 }).allies).toBe(0);
      expect(withSetup(base, { allies: 1.6 }).allies).toBe(2);
      expect(withSetup(base, { allies: Number.NaN }).allies).toBe(0);
      expect(withSetup(withSetup(base, { allies: 3 }), { aiCount: 2 }).allies).toBe(1);
      expect(withSetup(withSetup(base, { allies: 3 }), { aiCount: 1 }).allies).toBe(0);
    });

    it('defaults unknown treaty, start-resource and speed values', () => {
      const bad = { treatyMin: 15, startResources: 'huge', speed: 3 } as unknown as Partial<GameSetupConfig>;
      const c = withSetup(defaultSetupConfig(1), bad);
      expect([c.treatyMin, c.startResources, c.speed]).toEqual([0, 'normal', 1]);
      const ok = withSetup(defaultSetupConfig(1), { treatyMin: 20, startResources: 'deathmatch', speed: 1.5 });
      expect([ok.treatyMin, ok.startResources, ok.speed]).toEqual([20, 'deathmatch', 1.5]);
    });

    it('a setup without the M16 fields (older caller) gets the defaults', () => {
      const { allies: _a, treatyMin: _t, startResources: _s, speed: _sp, ...old } = defaultSetupConfig(1);
      const c = withSetup(old as GameSetupConfig, {});
      expect([c.allies, c.treatyMin, c.startResources, c.speed]).toEqual([0, 0, 'normal', 1]);
    });

    it('startResourcesFor returns the three presets as fresh copies', () => {
      const base = defaultSetupConfig(1);
      expect(startResourcesFor(base)).toEqual({ food: 200, wood: 200, gold: 100 });
      expect(startResourcesFor(withSetup(base, { startResources: 'high' }))).toEqual({ food: 2000, wood: 2000, gold: 1500 });
      expect(startResourcesFor(withSetup(base, { startResources: 'deathmatch' }))).toEqual({ food: 20000, wood: 20000, gold: 20000 });
      const a = startResourcesFor(base);
      a.food = 0;
      expect(startResourcesFor(base).food).toBe(200);
    });
  });
});
