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

  it('the first press arms, the second deletes', () => {
    pressDelete(7);
    expect(uiStore.getState().deleteArmedId).toBe(7);
    expect(sent).toEqual([]);
    pressDelete(7);
    expect(sent).toEqual([{ type: 'delete-building', buildingId: 7 }]);
    expect(uiStore.getState().deleteArmedId).toBeNull();
  });

  it('disarms after the timeout', () => {
    pressDelete(7);
    vi.advanceTimersByTime(DELETE_CONFIRM_MS + 1);
    expect(uiStore.getState().deleteArmedId).toBeNull();
    pressDelete(7);
    expect(sent).toEqual([]);
  });

  it('arming another building does not delete the first', () => {
    pressDelete(7);
    pressDelete(8);
    expect(uiStore.getState().deleteArmedId).toBe(8);
    expect(sent).toEqual([]);
  });

  it('the key acts on the selected own building only', () => {
    const base = { id: 3, hp: { current: 1, max: 1 }, tile: { tx: 0, ty: 0 }, buildingType: 'house', civ: 'hungarian' } as const;
    uiStore.getState().setSelectedEntity({ kind: 'building', ownerId: 2, ...base });
    requestDeleteSelected(1);
    expect(uiStore.getState().deleteArmedId).toBeNull();
    uiStore.getState().setSelectedEntity({ kind: 'building', ownerId: 1, ...base });
    requestDeleteSelected(1);
    requestDeleteSelected(1);
    expect(sent).toEqual([{ type: 'delete-building', buildingId: 3 }]);
  });
});
