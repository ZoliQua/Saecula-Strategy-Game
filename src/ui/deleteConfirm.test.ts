import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onCommand, type GameCommand } from './events';
import { DELETE_CONFIRM_MS, pressDelete, requestDeleteSelected } from './deleteConfirm';
import { resetUiStore, uiStore } from './store';

describe('delete confirmation (press to arm, press again within 3 s to delete)', () => {
  let sent: GameCommand[];
  let off: () => void;
  beforeEach(() => {
    vi.useFakeTimers();
    resetUiStore();
    sent = [];
    off = onCommand((c) => void sent.push(c));
  });
  afterEach(() => {
    off();
    vi.useRealTimers();
  });

  it('the first press arms (locking the refund shown), the second deletes at that refund', () => {
    pressDelete(7, 41);
    expect(uiStore.getState().deleteArmedId).toBe(7);
    expect(uiStore.getState().deleteArmedPct).toBe(41);
    expect(sent).toEqual([{ type: 'arm-delete', buildingId: 7, refundPct: 41 }]);
    // The game may lower the lock to the live rule at arm time; the command carries the lock.
    uiStore.getState().setDeleteArmed(7, 38);
    pressDelete(7, 20);
    expect(sent.at(-1)).toEqual({ type: 'delete-building', buildingId: 7, refundPct: 38 });
    expect(uiStore.getState().deleteArmedId).toBeNull();
  });

  it('disarms after the timeout', () => {
    pressDelete(7, 0);
    vi.advanceTimersByTime(DELETE_CONFIRM_MS + 1);
    expect(uiStore.getState().deleteArmedId).toBeNull();
    pressDelete(7, 0);
    expect(sent.filter((c) => c.type === 'delete-building')).toEqual([]);
  });

  it('arming another building does not delete the first', () => {
    pressDelete(7, 0);
    pressDelete(8, 0);
    expect(uiStore.getState().deleteArmedId).toBe(8);
    expect(sent.filter((c) => c.type === 'delete-building')).toEqual([]);
  });

  it('the key acts on the selected own building only', () => {
    const base = { id: 3, hp: { current: 1, max: 1 }, tile: { tx: 0, ty: 0 }, buildingType: 'house', civ: 'hungarian' } as const;
    uiStore.getState().setSelectedEntity({ kind: 'building', ownerId: 2, ...base });
    requestDeleteSelected(1);
    expect(uiStore.getState().deleteArmedId).toBeNull();
    uiStore.getState().setSelectedEntity({ kind: 'building', ownerId: 1, ...base, constructionProgress: 0.25 });
    requestDeleteSelected(1);
    requestDeleteSelected(1);
    expect(sent).toEqual([
      { type: 'arm-delete', buildingId: 3, refundPct: 60 },
      { type: 'delete-building', buildingId: 3, refundPct: 60 },
    ]);
  });
});

describe('the armed delete follows the selection', () => {
  it('a new selection disarms; a refresh of the same building keeps the arm', () => {
    resetUiStore();
    const base = { kind: 'building', ownerId: 1, hp: { current: 1, max: 1 }, tile: { tx: 0, ty: 0 }, buildingType: 'house', civ: 'hungarian' } as const;
    uiStore.getState().setSelectedEntity({ ...base, id: 3 });
    uiStore.getState().setDeleteArmed(3);
    uiStore.getState().setSelectedEntity({ ...base, id: 3, hp: { current: 1, max: 2 } });
    expect(uiStore.getState().deleteArmedId).toBe(3);
    uiStore.getState().setSelectedEntity({ ...base, id: 4 });
    expect(uiStore.getState().deleteArmedId).toBeNull();
  });
});
