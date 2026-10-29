import { refundPercent } from '../game/refund';
import { dispatchCommand } from './events';
import { uiStore } from './store';

/** How long an armed delete button waits for the confirming second press. */
export const DELETE_CONFIRM_MS = 3000;

let disarmTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * One press of "delete" on `buildingId`: the first press arms it with the
 * refund the button shows (`refundPct`) locked, and tells the game, which
 * lowers the lock if the live rule allows less at that moment; a second
 * press within DELETE_CONFIRM_MS sends the delete command with the locked
 * percentage, the one the armed button showed. Arming another building
 * replaces the arm.
 */
export function pressDelete(buildingId: number, refundPct: number): void {
  const state = uiStore.getState();
  if (disarmTimer !== null) clearTimeout(disarmTimer);
  disarmTimer = null;
  if (state.deleteArmedId === buildingId) {
    const locked = state.deleteArmedPct;
    state.setDeleteArmed(null);
    dispatchCommand({ type: 'delete-building', buildingId, refundPct: locked });
    return;
  }
  state.setDeleteArmed(buildingId, refundPct);
  dispatchCommand({ type: 'arm-delete', buildingId, refundPct });
  disarmTimer = setTimeout(() => {
    disarmTimer = null;
    if (uiStore.getState().deleteArmedId === buildingId) uiStore.getState().setDeleteArmed(null);
  }, DELETE_CONFIRM_MS);
}

/** The delete key: a press on the selected building, if it is the human's and still standing. */
export function requestDeleteSelected(humanId: number): void {
  const sel = uiStore.getState().selectedEntity;
  if (sel?.kind !== 'building' || sel.ownerId !== humanId || sel.hp.current <= 0) return;
  pressDelete(sel.id, refundPercent(sel.constructionProgress ?? null));
}
