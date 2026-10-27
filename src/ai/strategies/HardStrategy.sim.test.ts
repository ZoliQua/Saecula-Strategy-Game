import { describe, expect, it } from 'vitest';
import { createRng } from '../../map/random';
import type { AIStrategy } from '../AIPlayer';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { EasyStrategy } from './EasyStrategy';
import { HardStrategy } from './HardStrategy';
import { MediumStrategy } from './MediumStrategy';

const MIN = 60_000;

interface Duel {
  /** Game time Easy's / Medium's town centre fell (Infinity when it stands). */
  wonAt: number;
  hard: HardStrategy;
  stances: Set<string>;
  scoutsSeen: number;
  /** Game time the first wave (the scout pressure) left. */
  firstAttackAt: number;
}

/**
 * Hard (player 2) against `rival` (player 3) on a 64×64 meadow, pitted
 * against each other; the passive human (player 1) just sits there.
 * Hard gets its difficulty handicap (+20% gather), the rival none.
 */
function duel(seed: number, rival: (rng: () => number) => AIStrategy, minutes = 25): Duel {
  const hard = new HardStrategy(createRng(seed * 31 + 2));
  const match = createHeadlessMatch({
    seed,
    size: 64,
    aiCount: 2,
    strategy: (id) => (id === 2 ? hard : rival(createRng(seed * 31 + id))),
    enemyOf: (id) => (id === 2 ? 3 : 2),
    difficulty: (id) => (id === 2 ? 'hard' : 'easy'),
  });
  const rivalTc = match.world.entities.find((e) => e.owner?.playerId === 3 && e.building?.type === 'town_center')!;
  const out: Duel = { wonAt: Infinity, hard, stances: new Set(), scoutsSeen: 0, firstAttackAt: Infinity };
  match.run(minutes * MIN, 100, (t) => {
    out.stances.add(hard.currentStance);
    if (out.firstAttackAt === Infinity && hard.thoughts().recent.some((r) => r.kind === 'attack')) out.firstAttackAt = t;
    const scouts = match.world.entities.filter((e) => e.owner?.playerId === 2 && e.unit?.unitType === 'scout').length;
    out.scoutsSeen = Math.max(out.scoutsSeen, scouts);
    if (rivalTc.dying || rivalTc.health!.current <= 0) {
      out.wonAt = t;
      return true;
    }
  });
  return out;
}

describe('HardStrategy headless duels (64×64 meadow)', () => {
  it('beats Easy on fixed seed 7 within 25 simulated minutes: Easy\'s TC destroyed (measured 12.1 min)', () => {
    const r = duel(7, (rng) => new EasyStrategy(rng));
    expect(r.wonAt).toBeLessThan(25 * MIN);
    // Two scouts out and a stance read from what it saw.
    expect(r.scoutsSeen).toBeGreaterThanOrEqual(2);
    expect([...r.stances].some((s) => s !== 'balanced')).toBe(true);
  });

  /**
   * Measured (re-measured in Task 19, unchanged) on seeds 1-8: Easy's TC falls at 10.49 / 13.11 / 12.60 /
   * 12.14 / 13.85 / 11.97 / 12.12 / 10.78 min; the scout pressure (§10.3 first attack, rolled at 3-5 min,
   * leaves once three scouts are out) at 4.70 / 4.71 / 4.97 / 4.98 / 4.99 / 4.74 / 4.76 / 4.70 min. No seed
   * in 1-8 is left out.
   */
  it('on seeds 1-8: first attack leaves at 3-5 min (§10.3; measured 4.70-4.99) and Easy\'s TC falls within 14.5 min (worst 13.85)', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const r = duel(seed, (rng) => new EasyStrategy(rng));
      expect(r.firstAttackAt, `seed ${seed} first attack`).toBeGreaterThanOrEqual(3 * MIN);
      expect(r.firstAttackAt, `seed ${seed} first attack`).toBeLessThanOrEqual(5 * MIN);
      expect(r.wonAt, `seed ${seed}`).toBeLessThan(14.5 * MIN);
    }
  });

  it('beats Medium on fixed seed 4 within 23 minutes (measured 21.86 min)', () => {
    expect(duel(4, (rng) => new MediumStrategy(rng)).wonAt).toBeLessThan(23 * MIN);
  });
});
