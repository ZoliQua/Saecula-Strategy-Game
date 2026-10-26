import { describe, expect, it } from 'vitest';
import { MAP_TEMPLATES } from '../../map/generator';
import { createRng } from '../../map/random';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { MediumStrategy } from './MediumStrategy';

const MIN = 60_000;

/**
 * Medium against Medium (players 2 and 3, the human passive) on every
 * template, 64×64, seed 1: no AI deadlocks on cliffs, water, dense forest
 * or the fortress walls. Measured (this build): both AIs build their base
 * and raid by 7.6 min; the stronger one reaches age 2 at 11.2-13.1 min
 * (meadow 11.6, wilderness 13.1, islands 11.6, fortress 11.2, random 11.8).
 */
describe.each(MAP_TEMPLATES)('Medium vs Medium on %s (64×64, seed 1)', (template) => {
  it('both build a base and raid by 9 min; one reaches age 2 by 14 min', () => {
    const seed = 1;
    const match = createHeadlessMatch({
      seed,
      size: 64,
      aiCount: 2,
      template,
      strategy: (id) => new MediumStrategy(createRng(id * 977 + seed)),
      enemyOf: (id) => (id === 2 ? 3 : 2),
    });
    const raidAt = new Map<number, number>();
    let age2At = Infinity;
    match.run(14 * MIN, 100, (t) => {
      for (const ai of match.ais) {
        if (!raidAt.has(ai.player.id) && ai.strategy.thoughts!().recent.some((r) => r.kind === 'attack')) raidAt.set(ai.player.id, t);
        if (age2At === Infinity && ai.player.age >= 2) age2At = t;
      }
    });
    for (const ai of match.ais) {
      const id = ai.player.id;
      const built = new Set(
        match.world.entities.filter((e) => e.owner?.playerId === id && e.building && !e.underConstruction).map((e) => e.building!.type),
      );
      for (const type of ['town_center', 'house', 'farm', 'barracks'] as const) expect(built.has(type), `player ${id} ${type}`).toBe(true);
      expect(raidAt.get(id) ?? Infinity, `player ${id} raid`).toBeLessThanOrEqual(9 * MIN);
    }
    expect(age2At).toBeLessThanOrEqual(14 * MIN);
  });
});
