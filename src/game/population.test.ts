import { describe, expect, it } from 'vitest';
import type { Entity } from '../ecs/components';
import { computePopulation, MAX_POPULATION } from './population';

const building = (type: 'town_center' | 'house', playerId: number, extra: Partial<Entity> = {}): Entity => ({
  building: { type, footprint: { width: 2, height: 2 } },
  owner: { playerId },
  ...extra,
});
const unit = (playerId: number, amount = 1): Entity => ({ owner: { playerId }, populationCost: { amount } });

describe('computePopulation', () => {
  it('counts own units and finished standing buildings only', () => {
    const entities = [
      building('town_center', 2),
      building('house', 2),
      building('house', 2, { underConstruction: { totalTime: 1, elapsed: 0 } }),
      building('house', 2, { dying: { ttlMs: 10 } }),
      building('house', 3),
      unit(2),
      unit(2, 2),
      unit(3),
    ];
    expect(computePopulation(entities, 2, 0)).toEqual({ current: 3, cap: 10 });
    expect(computePopulation(entities, 2, 2)).toEqual({ current: 3, cap: 12 });
  });

  it('clamps the cap', () => {
    const houses = Array.from({ length: 60 }, () => building('house', 1));
    expect(computePopulation(houses, 1, 0).cap).toBe(MAX_POPULATION);
  });
});
