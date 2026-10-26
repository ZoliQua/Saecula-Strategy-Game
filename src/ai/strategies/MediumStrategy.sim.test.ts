import { describe, expect, it } from 'vitest';
import { createRng } from '../../map/random';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { MediumStrategy } from './MediumStrategy';

const MIN = 60_000;
/** Fixed seeds; measured (64×64, passive human): age 2 at 15.1 / 14.2 / 13.8 / 13.5 / 14.1 / 12.7 min, first raid 7.8 / 7.7 / 7.5 / 8.0 / 9.4 / 6.5 min. */
const SEEDS = [4242, 7, 99, 1234, 555, 8];

interface Milestones {
  age2: number;
  firstAttack: number;
}

function play(seed: number): Milestones {
  const match = createHeadlessMatch({ seed, size: 64, aiCount: 1, strategy: (id) => new MediumStrategy(createRng(id * 977 + seed)) });
  const ai = match.players.get(2)!;
  const strategy = match.ais[0]!.strategy;
  const m: Milestones = { age2: Infinity, firstAttack: Infinity };
  match.run(16 * MIN, 100, (t) => {
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

describe('MediumStrategy headless simulation (64×64 meadow, 6 seeds, passive human)', () => {
  it('raids by 10 min in every game; reaches age 2 at a median ≤ 14.5 min, every game by 16 min (measured worst 15.1)', () => {
    const runs = SEEDS.map(play);
    for (const r of runs) {
      expect(r.firstAttack).toBeLessThanOrEqual(10 * MIN);
      expect(r.age2).toBeLessThanOrEqual(16 * MIN);
    }
    expect(median(runs.map((r) => r.age2))).toBeLessThanOrEqual(14.5 * MIN);
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
