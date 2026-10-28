import { describe, expect, it } from 'vitest';
import { createRng } from '../../map/random';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { HardStrategy } from './HardStrategy';

const MIN = 60_000;
const SIM_TIMEOUT_MS = 240_000;
/** Measured 26.79 min (Task 1: age 3 at about 20 min, then saving 2000/2000/1000); pinned at +15 %. */
const PLACED_BY_MS = 26.79 * 1.15 * MIN;

/** Hard alone (vs the passive human) on a 64×64 meadow, seed 2: game time its Wonder site went down (Infinity: none). */
function wonderPlacedAt(wonderVictory: boolean, minutes = 40): { at: number; age: number } {
  const match = createHeadlessMatch({
    seed: 2,
    size: 64,
    aiCount: 1,
    strategy: () => new HardStrategy(createRng(2 * 31 + 2)),
    difficulty: () => 'hard',
    wonderVictory,
  });
  let at = Infinity;
  match.run(minutes * MIN, 100, (t) => {
    if (match.world.entities.some((e) => e.building?.type === 'wonder' && e.owner?.playerId === 2)) {
      at = t;
      return true;
    }
  });
  return { at, age: match.players.get(2)!.age };
}

describe('AI Wonder play (64×64 meadow, seed 2, Hard alone)', () => {
  it('places a Wonder site within 40 min when the Wonder can win', () => {
    const r = wonderPlacedAt(true);
    expect(r.age).toBe(3);
    expect(r.at).toBeLessThan(40 * MIN);
    expect(r.at).toBeLessThan(PLACED_BY_MS);
  }, SIM_TIMEOUT_MS);

  it('places none in conquest-only mode', () => {
    expect(wonderPlacedAt(false).at).toBe(Infinity);
  }, SIM_TIMEOUT_MS);
});
