import { BUILDING_BALANCE } from '../config/balance';
import type { Entity } from '../ecs/components';
import type { Population } from '../types';

/** Hard population ceiling regardless of houses. */
export const MAX_POPULATION = 200;

/**
 * A player's population: the pop cost of every owned unit, and the cap
 * from finished, standing buildings (+ `perHouseBonus` per house from
 * the house technology), clamped to MAX_POPULATION.
 */
export function computePopulation(
  entities: Iterable<Entity>,
  playerId: number,
  perHouseBonus: number,
): Population {
  let current = 0;
  let cap = 0;
  for (const e of entities) {
    if (e.owner?.playerId !== playerId) continue;
    if (e.populationCost) current += e.populationCost.amount;
    if (!e.building || e.underConstruction || e.dying) continue;
    cap += BUILDING_BALANCE[e.building.type].popBonus;
    if (e.building.type === 'house') cap += perHouseBonus;
  }
  return { current, cap: Math.min(cap, MAX_POPULATION) };
}
