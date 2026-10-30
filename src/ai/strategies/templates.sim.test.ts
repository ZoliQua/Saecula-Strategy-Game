import { describe, expect, it } from 'vitest';
import { MAP_TEMPLATES } from '../../map/generator';
import { createRng } from '../../map/random';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { MediumStrategy } from './MediumStrategy';

const MIN = 60_000;

/**
 * Medium against Medium (players 2 and 3, the human passive) on every
 * template, 64×64, seed 1: no AI deadlocks on cliffs, water, dense forest
 * or the fortress walls. Both AIs must build their base; the match must
 * move on (a raid by 9 min, age 2 by 15 min). The loser of the early raids
 * may be crippled before it raids (random seed 1: player 2 loses 8 of 11
 * villagers at 6-7 min), so raiding is not required of both.
 */
describe.each(MAP_TEMPLATES)('Medium vs Medium on %s (64×64, seed 1)', (template) => {
  it('both build a base; a raid leaves by 9 min and an AI reaches age 2 by 15 min', () => {
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
    match.run(15 * MIN, 100, (t) => {
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
    }
    expect(Math.min(...raidAt.values())).toBeLessThanOrEqual(9 * MIN);
    expect(age2At).toBeLessThanOrEqual(15 * MIN);
  });
});
