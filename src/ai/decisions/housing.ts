import { MAX_POPULATION } from '../../game/population';
import type { Population } from '../../types';

/**
 * Start another house when free population slots drop to `margin` or
 * fewer, unless one is already going up or the cap is maxed out.
 */
export function needsHouse(pop: Population, housesInProgress: number, margin: number): boolean {
  if (pop.cap >= MAX_POPULATION || housesInProgress > 0) return false;
  return pop.cap - pop.current <= margin;
}
