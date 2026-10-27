import { describe, expect, it } from 'vitest';
import { createRng } from '../../map/random';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { MediumStrategy } from './MediumStrategy';

const MIN = 60_000;
/**
 * Fixed seeds; measured (64×64, passive human, final-review fix wave: two-lode start economy at 300 gold
 * a tile, first attack rolled at 5-7.5 min, cannon saving, idle sites re-staffed): age 2 at 11.75 / 12.59 /
 * 11.67 / 12.17 / 12.77 / 11.77 / 11.47 / 12.69 min (median 11.97), age 3 at 19.35 / 20.19 / 18.85 /
 * 19.35 / 21.54 / 19.79 / 18.65 / 20.09 min, first raid 5.90 / 7.07 / 6.56 / 7.21 / 7.82 / 6.57 / 7.50 /
 * 6.05 min. No seed is left out (11 and 2024 used to stall on gather ping-pong and far-away gold; both fixed).
 */
const SEEDS = [4242, 7, 99, 1234, 555, 8, 11, 2024];

interface Milestones {
  age2: number;
  age3: number;
  firstAttack: number;
}

function play(seed: number): Milestones {
  const match = createHeadlessMatch({ seed, size: 64, aiCount: 1, strategy: (id) => new MediumStrategy(createRng(id * 977 + seed)) });
  const ai = match.players.get(2)!;
  const strategy = match.ais[0]!.strategy;
  const m: Milestones = { age2: Infinity, age3: Infinity, firstAttack: Infinity };
  match.run(23 * MIN, 100, (t) => {
    if (m.firstAttack === Infinity && strategy.thoughts!().recent.some((r) => r.kind === 'attack')) m.firstAttack = t;
    if (m.age2 === Infinity && ai.age >= 2) m.age2 = t;
    if (m.age3 === Infinity && ai.age >= 3) m.age3 = t;
    return m.age3 < Infinity && m.firstAttack < Infinity;
  });
  return m;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return (s[(s.length - 1) >> 1]! + s[s.length >> 1]!) / 2;
};

// The raid bound is the spec's 8 min (§10.2: 5-8), against a measured worst of 7.82 (seed 555): the roll
// stops at 7.5 min (AI_MEDIUM.firstAttackMs) so a squad a scout short still leaves in time. Re-measure
// rather than widen past the spec.
describe('MediumStrategy headless simulation (64×64 meadow, 8 seeds, passive human)', () => {
  it('on the listed seeds: raids by 8 min (§10.2: 5-8; worst 7.82), age 2 by 13 min each (worst 12.77), median ≤ 12, age 3 by 22 (worst 21.54)', () => {
    const runs = SEEDS.map(play);
    for (const [i, r] of runs.entries()) {
      expect(r.firstAttack, `seed ${SEEDS[i]} raid`).toBeGreaterThanOrEqual(5 * MIN);
      expect(r.firstAttack, `seed ${SEEDS[i]} raid`).toBeLessThanOrEqual(8 * MIN);
      expect(r.age2, `seed ${SEEDS[i]} age 2`).toBeLessThanOrEqual(13 * MIN);
      expect(r.age3, `seed ${SEEDS[i]} age 3`).toBeLessThanOrEqual(22 * MIN);
    }
    expect(median(runs.map((r) => r.age2))).toBeLessThanOrEqual(12 * MIN);
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
