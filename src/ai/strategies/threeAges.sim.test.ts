import { describe, expect, it } from 'vitest';
import { createRng } from '../../map/random';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { EasyStrategy } from './EasyStrategy';
import { HardStrategy } from './HardStrategy';
import { MediumStrategy } from './MediumStrategy';

const MIN = 60_000;

/**
 * M3 smoke (§M3.14) without a browser: the human slot is driven by a
 * Medium AI, against a Hard AI, through all three ages, every gameplay
 * system running. A head-on Medium-vs-Hard duel ends before age 2 (Hard's
 * 3-5 min raids break Medium's economy; measured on 96×96 seeds 1-4: the
 * human falls at 10.6-17.4 min), so an Easy third player is the early
 * target of both; once both reach the Enlightenment they turn on each other.
 * Measured (96×96, seed 1): both in age 3 by 19.5 min.
 */
describe('three-age match (96×96 meadow, seed 1): human slot = Medium AI vs Hard AI', () => {
  it('both reach age 3, fight with age-3 armies, and the world stays within the 500-entity budget', () => {
    let duel = false;
    const match = createHeadlessMatch({
      seed: 1,
      size: 96,
      aiCount: 2,
      strategy: (id) => (id === 2 ? new HardStrategy(createRng(10)) : new EasyStrategy(createRng(4))),
      difficulty: (id) => (id === 2 ? 'hard' : 'easy'),
      enemyOf: (id) => (id === 2 && duel ? 1 : 3),
      humanStrategy: new MediumStrategy(createRng(6)),
      humanEnemy: () => (duel ? 2 : 3),
    });
    const human = match.players.get(1)!;
    const hard = match.players.get(2)!;
    const live = () => match.world.entities.filter((e) => e.unit || e.building || e.projectile).length;
    const start = { units: match.world.entities.filter((e) => e.unit).length, buildings: match.world.entities.filter((e) => e.building).length };
    const seen = { maxEntities: 0, projectiles: new Set<string>(), dying: 0, carrying: false, age3Kinds: new Set<string>() };
    let bothAge3At = Infinity;
    match.run(45 * MIN, 100, (t) => {
      seen.maxEntities = Math.max(seen.maxEntities, live());
      for (const e of match.world.entities) {
        if (e.projectile) seen.projectiles.add(e.projectile.kind);
        if (e.dying && e.unit) seen.dying++;
        if ((e.gatherer?.carrying ?? 0) > 0) seen.carrying = true;
        if (e.unit && ['musketeer', 'cannon', 'cavalry'].includes(e.unit.unitType)) seen.age3Kinds.add(e.unit.unitType);
      }
      if (!duel && human.age >= 3 && hard.age >= 3) {
        duel = true;
        bothAge3At = t;
      }
      return duel && t >= bothAge3At + 8 * MIN;
    });
    expect(bothAge3At).toBeLessThan(25 * MIN);
    expect(seen.maxEntities).toBeLessThanOrEqual(500);
    // Gathering, construction, training, research, combat, projectiles and deaths all ran.
    expect(seen.carrying).toBe(true);
    expect(match.world.entities.filter((e) => e.building && !e.underConstruction).length).toBeGreaterThan(start.buildings);
    expect(match.world.entities.filter((e) => e.unit).length).toBeGreaterThan(start.units);
    expect(human.researched.size).toBeGreaterThan(0);
    expect(hard.researched.size).toBeGreaterThan(0);
    expect(seen.projectiles.size).toBeGreaterThan(0);
    expect(seen.dying).toBeGreaterThan(0);
    expect(seen.age3Kinds.size).toBeGreaterThan(0);
  });
});
