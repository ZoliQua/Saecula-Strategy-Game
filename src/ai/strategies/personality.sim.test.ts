import { describe, expect, it } from 'vitest';
import type { PersonalityId } from '../../config/aiBalance';
import type { Difficulty } from '../../game/GameSetupConfig';
import { createRng } from '../../map/random';
import { createStrategy } from '../createStrategy';
import { createHeadlessMatch } from '../testing/headlessMatch';
import type { AIStrategy } from '../AIPlayer';

const MIN = 60_000;

interface Run {
  /** Game time the first wave (any attack) left. */
  firstWave: number;
  /** Villagers alive at 12 min. */
  villagersAt12: number;
  /** Own towers and wall segments (sites included) at the end of the run. */
  forts: number;
}

/** One AI (player 2) of `difficulty` with `personality` against the passive human, 64×64 meadow. */
function play(difficulty: Difficulty, personality: PersonalityId, seed: number, minutes = 12): Run {
  const strategy: AIStrategy = createStrategy(difficulty, createRng(seed * 31 + 2), personality);
  const match = createHeadlessMatch({ seed, size: 64, aiCount: 1, strategy: () => strategy, difficulty: () => difficulty });
  const out: Run = { firstWave: Infinity, villagersAt12: 0, forts: 0 };
  match.run(minutes * MIN, 100, (t) => {
    if (out.firstWave === Infinity && strategy.thoughts!().recent.some((r) => r.kind === 'attack')) out.firstWave = t;
    if (t >= 12 * MIN && out.villagersAt12 === 0) {
      out.villagersAt12 = match.world.entities.filter((e) => e.owner?.playerId === 2 && e.unit?.unitType === 'villager').length;
    }
  });
  out.forts = match.world.entities.filter(
    (e) => e.owner?.playerId === 2 && (e.building?.type === 'tower' || e.building?.type === 'wall'),
  ).length;
  return out;
}

/**
 * Medium, seeds 1-3, passive human. Measured (Task 2): rusher's first wave at 6.56 / 6.55 / 6.67 min,
 * boomer's at 8.95 / 10.21 / 9.16; villagers at 12 min rusher 13 / 13 / 13, boomer 16 / 17 / 16
 * (+23-31 %). Turtle: first wave 9.79 / 10.78 / 9.78, villagers 15 / 17 / 14. Hard (villager share
 * scaled by the personality): villagers at 12 min boomer 15 / 17 / 15, rusher 12 / 12 / 12.
 */
describe('AI personalities headless (64×64 meadow, passive human)', () => {
  it('Medium: rusher\'s first wave leaves ≥ 60 s before boomer\'s, and boomer has ≥ 15 % more villagers at 12 min (seeds 1-3)', () => {
    for (const seed of [1, 2, 3]) {
      const rusher = play('medium', 'rusher', seed);
      const boomer = play('medium', 'boomer', seed);
      expect(rusher.firstWave, `seed ${seed}`).toBeLessThanOrEqual(boomer.firstWave - 60_000);
      expect(rusher.villagersAt12, `seed ${seed} sampled`).toBeGreaterThan(0);
      expect(boomer.villagersAt12, `seed ${seed}`).toBeGreaterThanOrEqual(rusher.villagersAt12 * 1.15);
    }
  }, 240_000);

  /**
   * Hard, seeds 1-3, passive human (it never attacks, so the turtle stance is never entered): the
   * turtle personality fortifies proactively from age 2. Measured towers + wall segments by 16 min:
   * turtle 5 / 3 / 4, rusher 0 / 0 / 0.
   */
  it('Hard: a turtle has ≥ 2 towers or wall segments by 16 min, a rusher fewer (seeds 1-3)', () => {
    for (const seed of [1, 2, 3]) {
      const turtle = play('hard', 'turtle', seed, 16);
      const rusher = play('hard', 'rusher', seed, 16);
      expect(turtle.forts, `seed ${seed} turtle`).toBeGreaterThanOrEqual(2);
      expect(rusher.forts, `seed ${seed} rusher`).toBeLessThan(turtle.forts);
    }
  }, 240_000);
});
