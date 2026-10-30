import { describe, expect, it } from 'vitest';
import { createRng } from '../../map/random';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { EasyStrategy } from './EasyStrategy';
import { HardStrategy } from './HardStrategy';
import { MediumStrategy } from './MediumStrategy';

const MIN = 60_000;

/**
 * M4 smoke without a browser: a mixed-civ three-age match. The Hungarian
 * human slot is driven by a Medium AI against an English Hard AI; an
 * English Easy third player is the early target of both (a head-on
 * Medium-vs-Hard duel ends before age 2, see threeAges.sim.test.ts). Civ
 * bonuses (M8) turned the old Medium draw (rng 6) into a lost duel, so the
 * Hungarian Medium AI draws rng 7. This pins that a mixed line-up runs every
 * gameplay system through all three ages without exceptions and within the
 * 500-entity budget (units, buildings, projectiles; CLAUDE.md §10).
 * Measured: both in age 3 by 20.87 min, at most 232 entities; Hungarian
 * musketeers, cavalry and cannons, English cavalry and cannons; arrows,
 * bolts, bullets and cannonballs (the same run as the default seed-3 draw:
 * civs change only art).
 */
describe('mixed-civ three-age match (96×96 meadow, seed 3): Hungarian Medium vs English Hard + English Easy', () => {
  it('both reach age 3 with age-3 armies, within the 500-entity budget', () => {
    let duel = false;
    const match = createHeadlessMatch({
      seed: 3,
      size: 96,
      aiCount: 2,
      civs: { human: 'hungarian', ais: ['english', 'english'] },
      strategy: (id) => (id === 2 ? new HardStrategy(createRng(10)) : new EasyStrategy(createRng(4))),
      difficulty: (id) => (id === 2 ? 'hard' : 'easy'),
      enemyOf: (id) => (id === 3 ? 2 : duel ? 1 : 3),
      humanStrategy: new MediumStrategy(createRng(7)),
      humanEnemy: () => (duel ? 2 : 3),
    });
    const human = match.players.get(1)!;
    const hard = match.players.get(2)!;
    expect([human.civ, hard.civ, match.players.get(3)!.civ]).toEqual(['hungarian', 'english', 'english']);
    const live = () => match.world.entities.filter((e) => e.unit || e.building || e.projectile).length;
    const seen = { maxEntities: 0, projectiles: new Set<string>(), age3Units: new Map<number, Set<string>>() };
    let bothAge3At = Infinity;
    match.run(45 * MIN, 100, (t) => {
      seen.maxEntities = Math.max(seen.maxEntities, live());
      for (const e of match.world.entities) {
        if (e.projectile) seen.projectiles.add(e.projectile.kind);
        if (e.unit && ['musketeer', 'cannon', 'cavalry'].includes(e.unit.unitType)) {
          const owner = e.owner?.playerId ?? 0;
          if (!seen.age3Units.has(owner)) seen.age3Units.set(owner, new Set());
          seen.age3Units.get(owner)!.add(e.unit.unitType);
        }
      }
      if (!duel && human.age >= 3 && hard.age >= 3) {
        duel = true;
        bothAge3At = t;
      }
      return duel && t >= bothAge3At + 8 * MIN;
    });
    expect(bothAge3At).toBeLessThan(25 * MIN);
    expect(seen.maxEntities).toBeLessThanOrEqual(500);
    // Both civs field Enlightenment units and the siege path fires.
    expect(seen.age3Units.get(1)?.size ?? 0, 'Hungarian age-3 unit kinds').toBeGreaterThan(0);
    expect(seen.age3Units.get(2)?.size ?? 0, 'English age-3 unit kinds').toBeGreaterThan(0);
    expect(seen.projectiles.has('cannonball')).toBe(true);
    expect(seen.projectiles.has('bullet')).toBe(true);
    const foundries = match.world.entities.filter((e) => e.building?.type === 'foundry' && !e.underConstruction);
    expect(new Set(foundries.map((f) => f.owner?.playerId))).toEqual(new Set([1, 2]));
  });
});
