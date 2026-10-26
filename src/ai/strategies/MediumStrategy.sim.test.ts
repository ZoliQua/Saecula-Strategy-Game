import { describe, expect, it } from 'vitest';
import { createRng } from '../../map/random';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { MediumStrategy } from './MediumStrategy';

const MIN = 60_000;
/**
 * Fixed seeds; measured (64×64, passive human, Task 17 start economy: a 5-6 tile gold lode, 6-7 berry bushes
 * of 125 food): age 2 at 11.59 / 10.84 / 11.65 / 11.34 / 12.02 / 11.14 / 11.02 / 11.34 min (median 11.34),
 * first raid 6.0 / 7.5 / 6.5 / 7.3 / 8.0 / 6.7 / 8.2 / 5.7 min. No seed is left out (11 and 2024 used to
 * stall on gather ping-pong and far-away gold; both fixed).
 */
const SEEDS = [4242, 7, 99, 1234, 555, 8, 11, 2024];

interface Milestones {
  age2: number;
  firstAttack: number;
}

function play(seed: number): Milestones {
  const match = createHeadlessMatch({ seed, size: 64, aiCount: 1, strategy: (id) => new MediumStrategy(createRng(id * 977 + seed)) });
  const ai = match.players.get(2)!;
  const strategy = match.ais[0]!.strategy;
  const m: Milestones = { age2: Infinity, firstAttack: Infinity };
  match.run(17 * MIN, 100, (t) => {
    if (m.firstAttack === Infinity && strategy.thoughts!().recent.some((r) => r.kind === 'attack')) m.firstAttack = t;
    if (m.age2 === Infinity && ai.age >= 2) m.age2 = t;
    return m.age2 < Infinity && m.firstAttack < Infinity;
  });
  return m;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return (s[(s.length - 1) >> 1]! + s[s.length >> 1]!) / 2;
};

describe('MediumStrategy headless simulation (64×64 meadow, 8 seeds, passive human)', () => {
  it('on the listed seeds: raids by 8.5 min (measured worst 8.2), age 2 by 12.25 min each (worst 12.02), median ≤ 11.5 min', () => {
    const runs = SEEDS.map(play);
    for (const [i, r] of runs.entries()) {
      expect(r.firstAttack, `seed ${SEEDS[i]} raid`).toBeLessThanOrEqual(8.5 * MIN);
      expect(r.age2, `seed ${SEEDS[i]} age 2`).toBeLessThanOrEqual(12.25 * MIN);
    }
    expect(median(runs.map((r) => r.age2))).toBeLessThanOrEqual(11.5 * MIN);
  });

  it('by 26 min has a mixed age-2 army, techs, and has hit the human base (seed 8)', () => {
    const match = createHeadlessMatch({ seed: 8, size: 64, aiCount: 1, strategy: (id) => new MediumStrategy(createRng(id * 977 + 8)) });
    const ai = match.players.get(2)!;
    const humanTc = match.world.entities.find((e) => e.owner?.playerId === 1 && e.building?.type === 'town_center')!;
    match.run(26 * MIN, 100);
    expect(humanTc.health!.current).toBeLessThan(humanTc.health!.max);
    const army = match.world.entities.filter(
      (e) => e.owner?.playerId === 2 && e.attacker && e.unit && e.unit.unitType !== 'villager' && e.unit.unitType !== 'scout',
    );
    expect(new Set(army.map((u) => u.unit!.unitType)).size).toBeGreaterThanOrEqual(2);
    expect(ai.age).toBeGreaterThanOrEqual(2);
    expect(ai.researched.size).toBeGreaterThan(1);
  });
});
