import { describe, expect, it } from 'vitest';
import type { Difficulty } from '../game/GameSetupConfig';
import { createPlayer } from '../game/Player';
import { createEcsWorld } from '../ecs/world';
import { MapData } from '../map/MapData';
import { createStatefulRng } from '../map/random';
import { AIPlayer } from './AIPlayer';
import { aiRngSeed, createStrategy } from './createStrategy';
import { EasyStrategy } from './strategies/EasyStrategy';
import { HardStrategy } from './strategies/HardStrategy';
import { MasterStrategy } from './strategies/MasterStrategy';
import { MediumStrategy } from './strategies/MediumStrategy';
import { NullStrategy } from './strategies/NullStrategy';
import { createHeadlessMatch } from './testing/headlessMatch';

const MIN = 60_000;
const SEED = 5;

/** A headless 64×64 match (seed 5) with one AI of `difficulty`, run for 8 minutes. */
function playedAi(difficulty: Difficulty): AIPlayer {
  const rng = createStatefulRng(aiRngSeed(SEED, 2));
  const match = createHeadlessMatch({
    seed: SEED,
    size: 64,
    aiCount: 1,
    strategy: () => createStrategy(difficulty, rng.next),
    rng: () => rng,
    difficulty: () => difficulty,
  });
  match.run(8 * MIN, 100);
  return match.ais[0]!;
}

describe('AI snapshot / restore', () => {
  for (const difficulty of ['easy', 'medium', 'hard', 'master'] as const) {
    it(`${difficulty}: the snapshot is JSON-safe and restores exactly`, () => {
      const ai = playedAi(difficulty);
      const s = ai.snapshot();
      expect(s.strategy.kind).toBe(difficulty);
      // (a) JSON-safe: survives a JSON round trip unchanged.
      expect(JSON.parse(JSON.stringify(s))).toEqual(s);
      // (b) A fresh AI of the same difficulty, restored, snapshots the same.
      const rng = createStatefulRng(1);
      const fresh = new AIPlayer(ai.player, createStrategy(difficulty, rng.next), { rng });
      fresh.restore(JSON.parse(JSON.stringify(s)));
      expect(fresh.snapshot()).toEqual(s);
      expect(rng.getState()).toBe(s.rngState);
    }, 120_000);
  }

  it('restoring a hard snapshot into a MediumStrategy throws TypeError', () => {
    const hard = new HardStrategy(createStatefulRng(1).next).snapshot();
    expect(hard.kind).toBe('hard');
    expect(() => new MediumStrategy(createStatefulRng(2).next).restore(hard)).toThrow(TypeError);
  });

  it('snapshot and restore both throw when the AI was built without an rng', () => {
    const s = new AIPlayer(createPlayer({ id: 2 }), new NullStrategy(), { rng: createStatefulRng(3) }).snapshot();
    expect(s.strategy).toEqual({ kind: 'null' });
    const noRng = new AIPlayer(createPlayer({ id: 2 }), new NullStrategy());
    expect(() => noRng.snapshot()).toThrow();
    expect(() => noRng.restore(s)).toThrow();
  });

  it('never-ticked strategies round-trip, "never" times included (an autosave at t = 0)', () => {
    const make = {
      medium: (r: () => number) => new MediumStrategy(r),
      hard: (r: () => number) => new HardStrategy(r),
      master: (r: () => number) => new MasterStrategy(r),
    };
    for (const build of Object.values(make)) {
      const s = build(createStatefulRng(4).next).snapshot();
      const json = JSON.parse(JSON.stringify(s));
      expect(json).toEqual(s);
      const fresh = build(createStatefulRng(5).next);
      fresh.restore(json);
      expect(fresh.snapshot()).toEqual(s);
      expect((fresh as unknown as { lastScoutMs: number }).lastScoutMs).toBe(-Infinity);
    }
    const hard = new HardStrategy(createStatefulRng(6).next);
    hard.restore(JSON.parse(JSON.stringify(new HardStrategy(createStatefulRng(7).next).snapshot())));
    const fields = hard as unknown as { rebalancedAtMs: number; harass: { endedAtMs: number } };
    expect(fields.rebalancedAtMs).toBe(-Infinity);
    expect(fields.harass.endedAtMs).toBe(-Infinity);
  });

  it("Easy's never-ages-up sentinel (Infinity) is saved as null and comes back as Infinity", () => {
    const never = new EasyStrategy(() => 0.99);
    const s = JSON.parse(JSON.stringify(never.snapshot()));
    expect(s.ageUpFromMs).toBeNull();
    const fresh = new EasyStrategy(() => 0);
    expect((fresh as unknown as { ageUpFromMs: number }).ageUpFromMs).not.toBe(Infinity);
    fresh.restore(s);
    expect((fresh as unknown as { ageUpFromMs: number }).ageUpFromMs).toBe(Infinity);
    expect(fresh.snapshot()).toEqual(s);
  });

  it('a restored AI keeps its fog-scan phase (restored AIs stay staggered)', () => {
    const ctx = { world: createEcsWorld(), mapData: new MapData(8, 8) };
    const ai = new AIPlayer(createPlayer({ id: 2 }), new NullStrategy(), { rng: createStatefulRng(1) });
    expect(ai.snapshot().fogSinceScanMs).toBeNull();
    ai.update(ctx, 100); // the first tick scans
    ai.update(ctx, 250);
    const s = ai.snapshot();
    expect(s.fogSinceScanMs).toBe(250);
    // Restored before its first tick: the phase is applied when the fog system is built.
    const unticked = new AIPlayer(createPlayer({ id: 2 }), new NullStrategy(), { rng: createStatefulRng(2) });
    unticked.restore(s);
    expect(unticked.snapshot()).toEqual(s);
    unticked.update(ctx, 100);
    expect(unticked.snapshot().fogSinceScanMs).toBe(350);
    // Restored after ticking: the running fog system takes the phase.
    const ticked = new AIPlayer(createPlayer({ id: 2 }), new NullStrategy(), { rng: createStatefulRng(3) });
    ticked.update(ctx, 100);
    ticked.restore(s);
    expect(ticked.snapshot().fogSinceScanMs).toBe(250);
  });

  it('aiRngSeed follows the sims pattern (seed * 31 + playerId) >>> 0', () => {
    expect(aiRngSeed(5, 2)).toBe(157);
    expect(aiRngSeed(0xffffffff, 3)).toBe((0xffffffff * 31 + 3) >>> 0);
  });
});
