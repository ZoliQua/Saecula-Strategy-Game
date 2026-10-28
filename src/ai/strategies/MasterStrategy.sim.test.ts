import { describe, expect, it } from 'vitest';
import { createRng } from '../../map/random';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { HardStrategy } from './HardStrategy';
import { MasterStrategy } from './MasterStrategy';

const MIN = 60_000;

/** Mesteri alone (player 2, master handicap) against the passive human: when it reached ages 2 and 3. */
function alone(seed: number): { age2: number; age3: number; recent: string } {
  const master = new MasterStrategy(createRng(seed * 31 + 2));
  const match = createHeadlessMatch({ seed, size: 64, aiCount: 1, strategy: () => master, difficulty: () => 'master' });
  const ai = match.players.get(2)!;
  let age2 = Infinity;
  let age3 = Infinity;
  match.run(21 * MIN, 100, (t) => {
    if (age2 === Infinity && ai.age >= 2) age2 = t;
    if (age3 === Infinity && ai.age >= 3) age3 = t;
    return age3 < Infinity;
  });
  return { age2, age3, recent: JSON.stringify(master.thoughts().recent) };
}

/**
 * Mesteri (player 2, master handicap) against Hard (player 3, hard handicap) on a 64×64 meadow, pitted
 * against each other; the passive human (player 1) just sits there. When the rival TC fell.
 */
function duel(seed: number, minutes: number): { wonAt: number; master: MasterStrategy } {
  const master = new MasterStrategy(createRng(seed * 31 + 2));
  const match = createHeadlessMatch({
    seed,
    size: 64,
    aiCount: 2,
    strategy: (id) => (id === 2 ? master : new HardStrategy(createRng(seed * 31 + id))),
    enemyOf: (id) => (id === 2 ? 3 : 2),
    difficulty: (id) => (id === 2 ? 'master' : 'hard'),
  });
  const rivalTc = match.world.entities.find((e) => e.owner?.playerId === 3 && e.building?.type === 'town_center')!;
  let wonAt = Infinity;
  match.run(minutes * MIN, 100, (t) => {
    if (rivalTc.dying || rivalTc.health!.current <= 0) {
      wonAt = t;
      return true;
    }
  });
  return { wonAt, master };
}

/** Hard alone (same setup as `alone`): when it reached age 2. */
function hardAge2(seed: number): number {
  const match = createHeadlessMatch({ seed, size: 64, aiCount: 1, strategy: () => new HardStrategy(createRng(seed * 31 + 2)), difficulty: () => 'hard' });
  const ai = match.players.get(2)!;
  let age2 = Infinity;
  match.run(16 * MIN, 100, (t) => {
    if (age2 === Infinity && ai.age >= 2) age2 = t;
    return age2 < Infinity;
  });
  return age2;
}

describe('MasterStrategy headless simulation (64×64 meadow)', () => {
  /**
   * Alone, seeds 1-4 (AI_MASTER after the Task 2 rulings: age-1 population 22, food-heavy Roman age,
   * raid recalled after 2 min): age 2 at 10.82 / 10.44 / 11.44 / 11.25 min, age 3 at 17.59 / 17.62 /
   * 19.05 / 18.44 min. Hard on the same seeds: age 2 at 12.65 / 11.89 / 12.64 / 12.62 (worst on 1-8:
   * 13.24 / 20.87).
   */
  it('on seeds 1-4 alone: age 2 by 12.0 min (worst 11.44) and earlier than Hard, age 3 by 19.5 min (worst 19.05)', () => {
    for (const seed of [1, 2, 3, 4]) {
      const r = alone(seed);
      expect(r.age2, `seed ${seed} age 2`).toBeLessThanOrEqual(12.0 * MIN);
      expect(r.age2, `seed ${seed} age 2 vs Hard`).toBeLessThan(hardAge2(seed));
      expect(r.age3, `seed ${seed} age 3`).toBeLessThanOrEqual(19.5 * MIN);
    }
  }, 300_000);

  /**
   * Against Hard, seeds 1-4: Hard's TC falls at — / 21.13 / 23.39 / 20.18 min (3 of 4); on seed 1 Hard's
   * scout pressure kills Mesteri's villagers and Mesteri loses its TC at 19.40. Flanks: 0 / 0 / 1 / 0
   * (the main waves leave at 10 in the rush stance; only seed 3 knew an economy building 6+ tiles from
   * the enemy TC then). Every duel runs to 27 min (the slowest win, 23.39, + 15 %).
   */
  it('beats Hard on ≥ 3 of seeds 1-4 within 27 min (measured 3: seeds 2-4), with a flank on seed 3', () => {
    const runs = [1, 2, 3, 4].map((seed) => ({ seed, ...duel(seed, 27) }));
    const wins = runs.filter((r) => r.wonAt <= 27 * MIN).map((r) => r.seed);
    expect(wins.length, `won on seeds ${wins.join(', ')}`).toBeGreaterThanOrEqual(3);
    expect(runs[2]!.wonAt).toBeLessThanOrEqual(27 * MIN);
    expect(runs[2]!.master.flanksLaunched).toBeGreaterThanOrEqual(1);
  }, 300_000);

  it('is deterministic: two runs of seed 3 give identical age-2 times and thought lists', () => {
    const a = alone(3);
    const b = alone(3);
    expect(a.age2).toBe(b.age2);
    expect(a.age2).toBeLessThan(Infinity);
    expect(a.recent).toBe(b.recent);
  }, 300_000);
});
