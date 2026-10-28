import { describe, expect, it } from 'vitest';
import type { Difficulty } from '../game/GameSetupConfig';
import { createPlayer } from '../game/Player';
import { createStatefulRng } from '../map/random';
import { AIPlayer } from './AIPlayer';
import { aiRngSeed, createStrategy } from './createStrategy';
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
    const s = playedAi('hard').snapshot();
    expect(() => new MediumStrategy(createStatefulRng(1).next).restore(s.strategy)).toThrow(TypeError);
  }, 120_000);

  it('AIPlayer.restore throws when the AI was built without an rng', () => {
    const rng = createStatefulRng(3);
    const withRng = new AIPlayer(createPlayer({ id: 2 }), new NullStrategy(), { rng });
    const s = withRng.snapshot();
    expect(s.strategy).toEqual({ kind: 'null' });
    expect(() => new AIPlayer(createPlayer({ id: 2 }), new NullStrategy()).restore(s)).toThrow();
  });

  it('aiRngSeed follows the sims pattern (seed * 31 + playerId) >>> 0', () => {
    expect(aiRngSeed(5, 2)).toBe(157);
    expect(aiRngSeed(0xffffffff, 3)).toBe((0xffffffff * 31 + 3) >>> 0);
  });
});
