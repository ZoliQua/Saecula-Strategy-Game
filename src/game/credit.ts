import { HUMAN_PLAYER_ID } from '../config/constants';
import type { EcsWorld } from '../ecs/world';
import type { ResourceType } from '../types';
import { uiStore } from '../ui/store';
import { gameEvents } from './events';
import type { PlayerManager } from './PlayerManager';

/**
 * Credits `amount` (whole units) of `type` to `playerId` as gathered
 * income: a villager's or fishing boat's delivery, a trader's arrival
 * (M17). The Player's stockpile grows (an AI spends from it), the human's
 * UI-store stockpile too (the authoritative one for the human, ecs/research
 * uiWallet), and `resourcesDelivered` counts it as gathered in MatchStats.
 * Market exchange is not income and never comes here.
 */
export function creditGathered(
  world: EcsWorld,
  players: PlayerManager | null,
  playerId: number,
  type: ResourceType,
  amount: number,
): void {
  if (amount <= 0) return;
  const player = players?.get(playerId);
  if (player) {
    player.resources[type] += amount;
    gameEvents.emit('resourcesDelivered', { world, playerId, amount });
  }
  if (playerId === HUMAN_PLAYER_ID) {
    const state = uiStore.getState();
    state.setResources({ [type]: state.resources[type] + amount });
  }
}
