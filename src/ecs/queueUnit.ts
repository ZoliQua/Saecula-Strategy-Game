import { uiStore } from '../ui/store';
import { isUnitAvailable } from '../game/availability';
import type { AgeId, Population, UnitType } from '../types';
import type { Entity } from './components';
import { UNIT_SPECS } from './archetypes/unit';
import { uiWallet, type Wallet } from './research';

export interface QueueUnitResult {
  readonly ok: boolean;
  readonly reason?:
    | 'missing-queue'
    | 'wrong-trainer'
    | 'researching'
    | 'age-locked'
    | 'queue-full'
    | 'insufficient-resources'
    | 'pop-cap';
}

/** Whose stockpile pays for the unit and whose population it counts against. */
export interface TrainAccount {
  readonly wallet: Wallet;
  /** Current population (queued units included where the caller tracks them) and cap. */
  population(): Population;
}

/** The human player's account: stockpile and population live in the UI store. */
export function uiTrainAccount(): TrainAccount {
  return { wallet: uiWallet(), population: () => uiStore.getState().population };
}

/**
 * Attempts to enqueue a training order on `trainer` for one unit of
 * `type`. Deducts resources on success and returns an error code
 * otherwise so the UI can show why the click was rejected. The rules
 * are enforced here for the human and the AI alike: the building must
 * be one of the unit's trainers, not researching or collapsing, and the
 * unit must be unlocked at `playerAge`.
 */
export function queueUnit(
  trainer: Entity,
  type: UnitType,
  playerAge: AgeId,
  account: TrainAccount = uiTrainAccount(),
): QueueUnitResult {
  const spec = UNIT_SPECS[type];
  // A collapsing building has lost its queue for good (TrainingSystem skips it).
  if (!trainer.trainingQueue || trainer.dying) return { ok: false, reason: 'missing-queue' };
  if (!trainer.building || !spec.trainers.includes(trainer.building.type)) {
    return { ok: false, reason: 'wrong-trainer' };
  }
  if (trainer.research) return { ok: false, reason: 'researching' };
  if (!isUnitAvailable(type, playerAge)) return { ok: false, reason: 'age-locked' };
  if (trainer.trainingQueue.entries.length >= trainer.trainingQueue.maxQueue) {
    return { ok: false, reason: 'queue-full' };
  }
  const pop = account.population();
  if (pop.current + spec.populationCost > pop.cap) {
    return { ok: false, reason: 'pop-cap' };
  }
  const have = account.wallet.get();
  if (have.food < spec.cost.food || have.wood < spec.cost.wood || have.gold < spec.cost.gold) {
    return { ok: false, reason: 'insufficient-resources' };
  }
  account.wallet.set({
    food: have.food - spec.cost.food,
    wood: have.wood - spec.cost.wood,
    gold: have.gold - spec.cost.gold,
  });
  trainer.trainingQueue.entries.push({
    unitType: type,
    elapsed: 0,
    totalTime: spec.trainTime,
  });
  return { ok: true };
}
