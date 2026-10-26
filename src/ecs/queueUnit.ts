import { uiStore } from '../ui/store';
import { isUnitAvailable } from '../game/availability';
import type { AgeId, UnitType } from '../types';
import type { Entity } from './components';
import { UNIT_SPECS } from './archetypes/unit';

export interface QueueUnitResult {
  readonly ok: boolean;
  readonly reason?: 'missing-queue' | 'researching' | 'age-locked' | 'queue-full' | 'insufficient-resources' | 'pop-cap';
}

/**
 * Attempts to enqueue a training order on `trainer` for one unit of
 * `type`. Deducts resources on success and returns an error code
 * otherwise so the UI can show why the click was rejected. A building
 * that is researching cannot train; `playerAge`, when given, gates the unit.
 */
export function queueUnit(
  trainer: Entity,
  type: UnitType,
  playerAge?: AgeId,
): QueueUnitResult {
  const spec = UNIT_SPECS[type];
  if (!trainer.trainingQueue) return { ok: false, reason: 'missing-queue' };
  if (trainer.research) return { ok: false, reason: 'researching' };
  if (playerAge !== undefined && !isUnitAvailable(type, playerAge)) {
    return { ok: false, reason: 'age-locked' };
  }
  if (trainer.trainingQueue.entries.length >= trainer.trainingQueue.maxQueue) {
    return { ok: false, reason: 'queue-full' };
  }
  const state = uiStore.getState();
  if (state.population.current + spec.populationCost > state.population.cap) {
    return { ok: false, reason: 'pop-cap' };
  }
  if (
    state.resources.food < spec.cost.food ||
    state.resources.wood < spec.cost.wood ||
    state.resources.gold < spec.cost.gold
  ) {
    return { ok: false, reason: 'insufficient-resources' };
  }
  state.setResources({
    food: state.resources.food - spec.cost.food,
    wood: state.resources.wood - spec.cost.wood,
    gold: state.resources.gold - spec.cost.gold,
  });
  trainer.trainingQueue.entries.push({
    unitType: type,
    elapsed: 0,
    totalTime: spec.trainTime,
  });
  return { ok: true };
}
