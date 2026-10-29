import type { TechId, UnitType } from '../types';

/**
 * Thin event bus between HUDScene (clicks) and GameScene (ECS). The
 * two scenes can't import each other directly, and keeping these
 * commands out of the Zustand store avoids polluting UI state with
 * imperative intents.
 */
export type GameCommand =
  | { type: 'queue-unit'; trainerId: number; unitType: UnitType }
  | { type: 'cancel-queue'; trainerId: number; index: number }
  | { type: 'research'; buildingId: number; techId: TechId }
  | { type: 'cancel-research'; buildingId: number }
  | { type: 'delete-building'; buildingId: number };

type Listener = (cmd: GameCommand) => void;

const listeners = new Set<Listener>();

export function dispatchCommand(cmd: GameCommand): void {
  for (const l of listeners) l(cmd);
}

export function onCommand(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
