import type { VillagerActivity } from '../stats/villagerActivity';
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
  /** The delete button was armed showing `refundPct`; the game lowers the lock to the live rule if it must. */
  | { type: 'arm-delete'; buildingId: number; refundPct: number }
  /** The armed delete confirmed: pays the percentage locked at arm time. */
  | { type: 'delete-building'; buildingId: number; refundPct: number }
  /** The camera to the human's next town centre (the Haza button). */
  | { type: 'camera-home' }
  /** One wheel notch of zoom around the screen centre (the minimap's ± buttons): 1 in, -1 out. */
  | { type: 'camera-zoom'; dir: 1 | -1 }
  /** Select exactly the human's villagers doing `activity` (a side panel row). */
  | { type: 'select-villagers'; activity: VillagerActivity };

type Listener = (cmd: GameCommand) => void;

const listeners = new Set<Listener>();

export function dispatchCommand(cmd: GameCommand): void {
  for (const l of listeners) l(cmd);
}

export function onCommand(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
