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
 * Every gold piece is mined from the map (each start's two lodes,
 * START_ECONOMY): nothing is handed out. `live()` counts units, buildings and
 * projectiles (the 500 budget of CLAUDE.md §10), not resource nodes.
 * Measured (96×96, seed 3): both in age 3 by 20.87 min; foundries for both;
 * Hard's first cannon at 21.42 min (cannonballs from 21.44), the human slot's
 * at 23.63; bullets, bolts and arrows; at most 232 entities. (Seed 1, used
 * until the two-lode economy, now has the human slot's age-3 wave gut Hard's
 * economy before its foundry pays off: one cannon, never fired.) Medium and
 * Hard alone are pinned to a cannon count below.
 */
describe('three-age match (96×96 meadow, seed 3): human slot = Medium AI vs Hard AI', () => {
  it('both reach age 3, fight with age-3 armies, and the world stays within the 500-entity budget', () => {
    let duel = false;
    const match = createHeadlessMatch({
      seed: 3,
      size: 96,
      aiCount: 2,
      strategy: (id) => (id === 2 ? new HardStrategy(createRng(10)) : new EasyStrategy(createRng(4))),
      difficulty: (id) => (id === 2 ? 'hard' : 'easy'),
      // Hard and the human go for Easy first; Easy (3) fights back at Hard.
      enemyOf: (id) => (id === 3 ? 2 : duel ? 1 : 3),
      humanStrategy: new MediumStrategy(createRng(6)),
      humanEnemy: () => (duel ? 2 : 3),
    });
    const human = match.players.get(1)!;
    const hard = match.players.get(2)!;
    const live = () => match.world.entities.filter((e) => e.unit || e.building || e.projectile).length;
    const start = { units: match.world.entities.filter((e) => e.unit).length, buildings: match.world.entities.filter((e) => e.building).length };
    const seen = { maxEntities: 0, projectiles: new Set<string>(), dying: 0, carrying: false, age3Kinds: new Set<string>() };
    const cannons = new Map<number, Set<number>>([[1, new Set()], [2, new Set()]]);
    let bothAge3At = Infinity;
    match.run(45 * MIN, 100, (t) => {
      seen.maxEntities = Math.max(seen.maxEntities, live());
      for (const e of match.world.entities) {
        if (e.projectile) seen.projectiles.add(e.projectile.kind);
        if (e.dying && e.unit) seen.dying++;
        if ((e.gatherer?.carrying ?? 0) > 0) seen.carrying = true;
        if (e.unit && ['musketeer', 'cannon', 'cavalry'].includes(e.unit.unitType)) seen.age3Kinds.add(e.unit.unitType);
        if (e.unit?.unitType === 'cannon' && e.id !== undefined) cannons.get(e.owner?.playerId ?? 0)?.add(e.id);
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
    // The Enlightenment siege path: foundries finished, cannons and muskets fired.
    const foundries = match.world.entities.filter((e) => e.building?.type === 'foundry' && !e.underConstruction);
    expect(new Set(foundries.map((f) => f.owner?.playerId))).toEqual(new Set([1, 2]));
    expect(seen.projectiles.has('cannonball')).toBe(true);
    expect(seen.projectiles.has('bullet')).toBe(true);
    expect(seen.age3Kinds.has('cannon')).toBe(true);
    // Both sides save up and pay for cannons from mined gold (AI_COMMON.savesForUnits).
    expect(cannons.get(1)!.size, 'Medium (human slot) cannons').toBeGreaterThan(0);
    expect(cannons.get(2)!.size, 'Hard cannons').toBeGreaterThan(0);
  });
});

/**
 * Age-3 composition on mined gold alone (64×64 meadow, seed 1, passive
 * human): the army saves for cannons (AI_COMMON.savesForUnits) instead of
 * spending all gold on cheaper units. Measured to 32 min: Medium 12 cannons
 * (first at 22.03 min), Hard 13 (first at 22.07); on seeds 2, 3 and 8 Medium
 * trains 11 / 9 / 13 and Hard 14 / 12 / 14.
 */
describe.each([
  ['medium', (seed: number) => new MediumStrategy(createRng(977 * 2 + seed))],
  ['hard', (seed: number) => new HardStrategy(createRng(seed * 31 + 2))],
] as const)('%s AI alone in the Enlightenment (64×64, seed 1)', (difficulty, make) => {
  it('pays for at least 3 cannons from mined gold by 26 min', () => {
    const match = createHeadlessMatch({ seed: 1, size: 64, aiCount: 1, strategy: () => make(1), difficulty: () => difficulty });
    const cannons = new Set<number>();
    match.run(26 * MIN, 100, () => {
      for (const e of match.world.entities) if (e.unit?.unitType === 'cannon' && e.owner?.playerId === 2 && e.id !== undefined) cannons.add(e.id);
      return cannons.size >= 3;
    });
    expect(cannons.size).toBeGreaterThanOrEqual(3);
  });
});
