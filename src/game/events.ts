import type { AgeId, TechId } from '../types';

/**
 * Small typed bus for game-side facts that render / UI code reacts to
 * (age-up transformation art, toasts). Emitters are ECS systems; they
 * never depend on who listens.
 */
export interface GameEvents {
  ageChanged: { playerId: number; age: AgeId };
  techResearched: { playerId: number; techId: TechId };
  /** A research command was refused for a reason the player should hear about. */
  researchRejected: { playerId: number; reason: 'already-in-progress' };
}

type Listener<K extends keyof GameEvents> = (payload: GameEvents[K]) => void;

const listeners: { [K in keyof GameEvents]: Set<Listener<K>> } = {
  ageChanged: new Set(),
  techResearched: new Set(),
  researchRejected: new Set(),
};

export const gameEvents = {
  on<K extends keyof GameEvents>(event: K, listener: Listener<K>): () => void {
    listeners[event].add(listener);
    return () => {
      listeners[event].delete(listener);
    };
  },
  emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    for (const l of [...listeners[event]]) l(payload);
  },
};
