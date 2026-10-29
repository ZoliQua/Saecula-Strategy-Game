import type { EcsWorld } from '../ecs/world';
import type { AgeId, BuildingType, TechId, UnitType } from '../types';

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
  /** A Wonder was finished and its victory clock started. */
  wonderCompleted: { playerId: number; entityId: number };
  /** A Wonder with a running clock was destroyed (or removed); its clock stopped. */
  wonderLost: { playerId: number; entityId: number };
  /**
   * The owner deleted its own building (M7). It dies through killEntity
   * with no attacker, so it is never a kill: no killer gets score for it.
   */
  buildingDeleted: { playerId: number; entityId: number; buildingType: BuildingType };
  /*
   * Match statistics (M7, src/stats/MatchStats.ts). `world` is the match
   * the fact happened in: headless sims may run several at once.
   */
  /** A unit or building died in combat; `killerId` is the attacker's owner (null: no attacker). Deletions never emit it. */
  entityKilled: {
    world: EcsWorld;
    killerId: number | null;
    victimOwnerId: number;
    unitType?: UnitType;
    buildingType?: BuildingType;
  };
  /** A villager dropped `amount` resources at a dropoff. */
  resourcesDelivered: { world: EcsWorld; playerId: number; amount: number };
  /** A trainer finished a unit. */
  unitTrained: { world: EcsWorld; playerId: number; unitType: UnitType };
  /** A construction site was finished. */
  buildingCompleted: { world: EcsWorld; playerId: number; entityId: number; buildingType: BuildingType };
  /** The pause menu opened or closed (PauseScene). The music ducks on it (Task 9); nothing in play listens. */
  pauseChanged: { paused: boolean };
}

type Listener<K extends keyof GameEvents> = (payload: GameEvents[K]) => void;

const listeners: { [K in keyof GameEvents]: Set<Listener<K>> } = {
  ageChanged: new Set(),
  techResearched: new Set(),
  researchRejected: new Set(),
  wonderCompleted: new Set(),
  wonderLost: new Set(),
  buildingDeleted: new Set(),
  entityKilled: new Set(),
  resourcesDelivered: new Set(),
  unitTrained: new Set(),
  buildingCompleted: new Set(),
  pauseChanged: new Set(),
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
