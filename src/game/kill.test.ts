import { describe, expect, it } from 'vitest';
import { BUILDING_DEATH_TTL_MS } from '../config/balance';
import type { Entity } from '../ecs/components';
import { createEcsWorld } from '../ecs/world';
import { applyDamage, DEATH_TTL_MS } from './kill';

type Damageable = Entity & { health: { current: number; max: number } };

describe('applyDamage dying timer', () => {
  it('gives units the short death fall and buildings the longer collapse', () => {
    const world = createEcsWorld();
    const unit = world.add({ health: { current: 5, max: 10 }, unit: { unitType: 'villager' } } as Damageable) as Damageable;
    const house = world.add({
      health: { current: 5, max: 100 },
      building: { type: 'house', footprint: { width: 2, height: 2 } },
    } as Damageable) as Damageable;
    expect(applyDamage(world, unit, 10)).toBe(true);
    expect(applyDamage(world, house, 10)).toBe(true);
    expect(unit.dying?.ttlMs).toBe(DEATH_TTL_MS);
    expect(house.dying?.ttlMs).toBe(BUILDING_DEATH_TTL_MS);
    expect(BUILDING_DEATH_TTL_MS).toBeGreaterThan(DEATH_TTL_MS);
  });
});
