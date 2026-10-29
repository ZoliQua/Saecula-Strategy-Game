import { dispatchCommand } from './events';
import { uiStore } from './store';

/** How long an armed delete button waits for the confirming second press. */
export const DELETE_CONFIRM_MS = 3000;

let disarmTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * One press of "delete" on `buildingId`: the first press arms it (the
 * button asks for confirmation), a second press within DELETE_CONFIRM_MS
 * sends the delete command. Arming another building replaces the arm.
 */
export function pressDelete(buildingId: number): void {
  const state = uiStore.getState();
  if (disarmTimer !== null) clearTimeout(disarmTimer);
  disarmTimer = null;
  if (state.deleteArmedId === buildingId) {
    state.setDeleteArmed(null);
    dispatchCommand({ type: 'delete-building', buildingId });
    return;
  }
  state.setDeleteArmed(buildingId);
  disarmTimer = setTimeout(() => {
    disarmTimer = null;
    if (uiStore.getState().deleteArmedId === buildingId) uiStore.getState().setDeleteArmed(null);
  }, DELETE_CONFIRM_MS);
}

/** The delete key: a press on the selected building, if it is the human's and still standing. */
export function requestDeleteSelected(humanId: number): void {
  const sel = uiStore.getState().selectedEntity;
  if (sel?.kind !== 'building' || sel.ownerId !== humanId || sel.hp.current <= 0) return;
  pressDelete(sel.id);
}
