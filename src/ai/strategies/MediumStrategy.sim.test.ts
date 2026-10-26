import { describe, expect, it } from 'vitest';
import { createRng } from '../../map/random';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { MediumStrategy } from './MediumStrategy';

const MIN = 60_000;

describe('MediumStrategy headless simulation (64×64 meadow, seed 8, passive human)', () => {
  it('ages up within 12 minutes, then builds a mixed army and attacks the human base', () => {
    const match = createHeadlessMatch({
      seed: 8,
      size: 64,
      aiCount: 1,
      strategy: (id) => new MediumStrategy(createRng(id * 977 + 8)),
    });
    const ai = match.players.get(2)!;
    const humanTc = match.world.entities.find((e) => e.owner?.playerId === 1 && e.building?.type === 'town_center')!;
    let age2At = Infinity;
    let attackedAt = Infinity;
    match.run(24 * MIN, 100, (t) => {
      if (ai.age >= 2 && age2At === Infinity) age2At = t;
      if (humanTc.health!.current < humanTc.health!.max && attackedAt === Infinity) attackedAt = t;
      return attackedAt < Infinity;
    });
    expect(age2At).toBeLessThanOrEqual(12 * MIN);
    // It found the human with its scout (no map knowledge) and sent a wave.
    expect(attackedAt).toBeLessThan(24 * MIN);
    const army = match.world.entities.filter((e) => e.owner?.playerId === 2 && e.attacker && e.unit && e.unit.unitType !== 'villager');
    expect(new Set(army.map((u) => u.unit!.unitType)).size).toBeGreaterThanOrEqual(2);
    expect(ai.researched.size).toBeGreaterThan(1);
  });
});
