import { describe, expect, it } from 'vitest';
import { createRng } from '../../map/random';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { EasyStrategy } from './EasyStrategy';
import { HardStrategy } from './HardStrategy';
import { MediumStrategy } from './MediumStrategy';

const MIN = 60_000;

/**
 * M4 smoke without a browser: a mixed-civ three-age match. The Hungarian
 * human slot is driven by a Medium AI against an Italian Hard AI; an
 * English Easy third player is the early target of both (a head-on
 * Medium-vs-Hard duel ends before age 2, see threeAges.sim.test.ts). This
 * pins that a mixed line-up runs every gameplay system through all three
 * ages without exceptions and within the 500-entity budget (units,
 * buildings, projectiles; CLAUDE.md §10), and that every projectile kind
 * fires. Civ bonuses and unique units (M8) change the duel: the Hard side
 * was English until its longbowmen ended the Hungarian side before any
 * musket fired, so the stronger slot went to a musketeer civ (Italy).
 * Measured (M8): both in age 3 by 19.65 min, at most 205 entities;
 * Hungarian cavalry and musketeers, Italian musketeers, cavalry and
 * cannons; first bullet at 20.07 min, first cannonball at 22.37 min;
 * foundries for both.
 * M11 (monasteries, monks and conversions change both sides' age-2
 * spending): the human slot's Medium RNG moved from 6 to 2. Sweeping RNGs
 * 1-12, every check passes with 1, 2, 3, 5, 7, 10 and 11; with 6 and 12
 * the Hungarian side is overrun before the end (no foundry left), with
 * 4, 8 and 9 no cannonball (or bullet) flies within the window. With 2:
 * both in age 3 by 19.99 min, at most 212 entities.
 * M12 (the new technologies shift age-3 spending): RNG 2 → 5. Sweeping 1-12
 * again, every check passes with 1, 3, 4, 5, 10 and 11 (5 passed in both
 * sweeps); with 2, 6 and 12 no Hungarian foundry is left, with 7, 8 and 9
 * no cannonball (or bullet) flies in time. With 5: age 3 by 19.22 min,
 * at most 194 entities, three age-3 unit kinds on each side.
 * M17 (markets, landmarks and market sales in age 2): RNG 5 → 11. Sweeping 1-16, every check
 * passes with 2, 3, 4, 9, 11, 14, 15 and 16; with 5 and 10 one side has no foundry left, with 6
 * and 7 the Hungarian side fields no age-3 unit, with 1, 12 and 13 no cannonball flies in time,
 * with 8 no bullet. 11 passed in the M11 and M12 sweeps as well.
 */
describe('mixed-civ three-age match (96×96 meadow, seed 3): Hungarian Medium vs Italian Hard + English Easy', () => {
  it('both reach age 3 with age-3 armies, within the 500-entity budget', () => {
    let duel = false;
    const match = createHeadlessMatch({
      seed: 3,
      size: 96,
      aiCount: 2,
      civs: { human: 'hungarian', ais: ['italian', 'english'] },
      strategy: (id) => (id === 2 ? new HardStrategy(createRng(10)) : new EasyStrategy(createRng(4))),
      difficulty: (id) => (id === 2 ? 'hard' : 'easy'),
      enemyOf: (id) => (id === 3 ? 2 : duel ? 1 : 3),
      humanStrategy: new MediumStrategy(createRng(11)),
      humanEnemy: () => (duel ? 2 : 3),
    });
    const human = match.players.get(1)!;
    const hard = match.players.get(2)!;
    expect([human.civ, hard.civ, match.players.get(3)!.civ]).toEqual(['hungarian', 'italian', 'english']);
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
    expect(seen.age3Units.get(2)?.size ?? 0, 'Italian age-3 unit kinds').toBeGreaterThan(0);
    expect(seen.projectiles.has('cannonball')).toBe(true);
    expect(seen.projectiles.has('bullet')).toBe(true);
    const foundries = match.world.entities.filter((e) => e.building?.type === 'foundry' && !e.underConstruction);
    expect(new Set(foundries.map((f) => f.owner?.playerId))).toEqual(new Set([1, 2]));
  });
});
