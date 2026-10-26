import { isTechAvailable } from '../game/availability';
import type { Player } from '../game/Player';
import { TECH_SPECS } from '../game/technologies';
import type { Resources, TechId } from '../types';
import { uiStore } from '../ui/store';
import type { Entity } from './components';

/** Where a player's stockpile lives (the human's is in the UI store, an AI's on its Player). */
export interface Wallet {
  get(): Resources;
  set(next: Resources): void;
}

export function playerWallet(player: Player): Wallet {
  return {
    get: () => player.resources,
    set: (next) => {
      player.resources = { ...next };
    },
  };
}

export function uiWallet(): Wallet {
  return {
    get: () => uiStore.getState().resources,
    set: (next) => uiStore.getState().setResources(next),
  };
}

export type ResearchFailure =
  | 'wrong-building'
  | 'under-construction'
  | 'already-researching'
  | 'training-busy'
  | 'unavailable'
  | 'insufficient-resources';

export interface StartResearchResult {
  readonly ok: boolean;
  readonly reason?: ResearchFailure;
}

/**
 * Starts `techId` on `building`: one research per building, and a
 * building with a non-empty training queue cannot research. The cost
 * is paid up front.
 */
export function startResearch(
  building: Entity,
  techId: TechId,
  player: Player,
  wallet: Wallet,
): StartResearchResult {
  const spec = TECH_SPECS[techId];
  if (!building.building || building.building.type !== spec.building) {
    return { ok: false, reason: 'wrong-building' };
  }
  if (building.underConstruction) return { ok: false, reason: 'under-construction' };
  if (building.research) return { ok: false, reason: 'already-researching' };
  if ((building.trainingQueue?.entries.length ?? 0) > 0) {
    return { ok: false, reason: 'training-busy' };
  }
  if (!isTechAvailable(techId, player)) return { ok: false, reason: 'unavailable' };
  const have = wallet.get();
  if (have.food < spec.cost.food || have.wood < spec.cost.wood || have.gold < spec.cost.gold) {
    return { ok: false, reason: 'insufficient-resources' };
  }
  wallet.set({
    food: have.food - spec.cost.food,
    wood: have.wood - spec.cost.wood,
    gold: have.gold - spec.cost.gold,
  });
  building.research = { techId, elapsed: 0, totalTime: spec.time };
  return { ok: true };
}

/**
 * Cancels the running research and refunds its full cost. Returns the
 * cancelled tech, or null when nothing was running. The caller removes
 * the component through the world (so queries update).
 */
export function cancelResearch(building: Entity, wallet: Wallet): TechId | null {
  const research = building.research;
  if (!research) return null;
  const cost = TECH_SPECS[research.techId].cost;
  const have = wallet.get();
  wallet.set({
    food: have.food + cost.food,
    wood: have.wood + cost.wood,
    gold: have.gold + cost.gold,
  });
  return research.techId;
}
