import { describe, expect, it } from 'vitest';
import { createUnit } from '../../ecs/archetypes/createUnit';
import { createRng } from '../../map/random';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { MediumStrategy } from './MediumStrategy';

const MIN = 60_000;
const SIM_TIMEOUT_MS = 240_000;

/*
 * M11: a Medium AI alone (vs the passive human) on a 64×64 meadow builds a
 * monastery in age 2, keeps AI_MEDIUM.monks.count monks, and its monks
 * convert enemy units that come into their reach.
 */
describe('Medium AI monks (M11)', () => {
  it(
    'builds a monastery, trains its monks, and converts an enemy unit walking up to them',
    () => {
      const match = createHeadlessMatch({
        seed: 3,
        size: 64,
        aiCount: 1,
        strategy: () => new MediumStrategy(createRng(3 * 31 + 2)),
        difficulty: () => 'medium',
      });
      const monks = () => match.world.entities.filter((e) => e.unit?.unitType === 'monk' && e.owner?.playerId === 2 && !e.dying);
      let monkAt = Infinity;
      match.run(40 * MIN, 100, (t) => {
        if (monks().length < 2) return;
        monkAt = t;
        return true;
      });
      expect(monkAt, 'two monks within 40 min').toBeLessThan(40 * MIN);
      expect(match.world.entities.some((e) => e.building?.type === 'monastery' && e.owner?.playerId === 2)).toBe(true);
      // No army slot ever trains monks: the count stays at the tuned two.
      match.run(3 * MIN, 100);
      expect(monks().length).toBeLessThanOrEqual(2);

      // A human knight walks up to the monks: one of them converts it.
      const monk = monks()[0]!;
      const knight = createUnit(match.world, { type: 'knight', tile: { tx: monk.position!.tx + 5, ty: monk.position!.ty }, playerId: 1 });
      match.run(30_000, 100, () => knight.owner!.playerId === 2);
      expect(knight.owner!.playerId).toBe(2);
      expect(match.stats.of(2).killValue).toBeGreaterThan(0);
    },
    SIM_TIMEOUT_MS,
  );
});
