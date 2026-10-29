import { describe, expect, it } from 'vitest';
import { bindingFromEvent, DEFAULT_KEYS, KEY_ACTIONS, KEY_GROUPS, keysHint, rebind, validBindings } from './keymap';

describe('keymap', () => {
  it('rebind panUp to KeyD swaps with panRight', () => {
    const r = rebind(DEFAULT_KEYS, 'panUp', { code: 'KeyD', label: 'D' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.swappedWith).toBe('panRight');
    expect(r.keys.panUp).toEqual({ code: 'KeyD', label: 'D' });
    expect(r.keys.panRight).toEqual(DEFAULT_KEYS.panUp);
    expect(r.keys.panLeft).toEqual(DEFAULT_KEYS.panLeft);
  });

  it('Escape, ArrowUp and ShiftLeft are refused', () => {
    for (const code of ['Escape', 'ArrowUp', 'ShiftLeft']) {
      expect(rebind(DEFAULT_KEYS, 'panLeft', { code, label: code })).toEqual({ ok: false, reason: 'reserved' });
    }
  });

  it('same key is a no-op', () => {
    const r = rebind(DEFAULT_KEYS, 'panDown', { code: 'KeyS', label: 'S' });
    expect(r).toEqual({ ok: true, keys: DEFAULT_KEYS });
  });

  it('a free key moves the action without a swap', () => {
    const r = rebind(DEFAULT_KEYS, 'panUp', { code: 'KeyI', label: 'I' });
    expect(r.ok && r.swappedWith).toBe(undefined);
    expect(r.ok && r.keys.panUp.code).toBe('KeyI');
  });

  it('lock keys and codes with no physical key are refused', () => {
    for (const code of ['', 'Unidentified', 'CapsLock', 'NumLock', 'ScrollLock']) {
      expect(rebind(DEFAULT_KEYS, 'panUp', { code, label: 'X' })).toEqual({ ok: false, reason: 'reserved' });
    }
  });

  it('the same key with a new label (a changed layout) updates the label', () => {
    const r = rebind(DEFAULT_KEYS, 'panUp', { code: 'KeyW', label: 'Z' });
    expect(r.ok && r.swappedWith).toBe(undefined);
    expect(r.ok && r.keys.panUp).toEqual({ code: 'KeyW', label: 'Z' });
  });

  it('bindingFromEvent labels a QWERTZ KeyY as Z', () => {
    expect(bindingFromEvent({ code: 'KeyY', key: 'z' })).toEqual({ code: 'KeyY', label: 'Z' });
  });

  it('bindingFromEvent uses the Hungarian key names, else the code', () => {
    expect(bindingFromEvent({ code: 'Space', key: ' ' }).label).toBe('Szóköz');
    expect(bindingFromEvent({ code: 'Semicolon', key: 'é' }).label).toBe('É');
    expect(bindingFromEvent({ code: 'Insert', key: 'Insert' }).label).toBe('Insert');
  });

  it('keysHint reads the bindings in up-left-down-right order', () => {
    expect(keysHint(DEFAULT_KEYS)).toBe('WASD');
    const r = rebind(DEFAULT_KEYS, 'panUp', { code: 'Insert', label: 'Insert' });
    expect(r.ok && keysHint(r.keys)).toBe('Insert/A/S/D');
  });

  it('the defaults are valid across the whole action set', () => {
    expect(validBindings(DEFAULT_KEYS)).toBe(true);
    expect(KEY_ACTIONS).toEqual(['panUp', 'panDown', 'panLeft', 'panRight', 'home', 'scorePanel', 'villagerPanel', 'techTree', 'deleteBuilding']);
    expect(DEFAULT_KEYS.deleteBuilding.code).toBe('Delete');
    expect(DEFAULT_KEYS.scorePanel.code).toBe('Tab');
  });

  it('the groups list every action exactly once', () => {
    const grouped = KEY_GROUPS.flatMap((g) => g.actions);
    expect([...grouped].sort()).toEqual([...KEY_ACTIONS].sort());
    expect(KEY_GROUPS.map((g) => g.id)).toEqual(['camera', 'commands']);
  });

  it('a rebind across the larger action set swaps (pan key onto a command key)', () => {
    const r = rebind(DEFAULT_KEYS, 'panLeft', { code: 'KeyH', label: 'H' });
    expect(r.ok && r.swappedWith).toBe('home');
    expect(r.ok && r.keys.home).toEqual(DEFAULT_KEYS.panLeft);
    expect(r.ok && validBindings(r.keys)).toBe(true);
  });

  it('a command key onto another command key swaps', () => {
    const r = rebind(DEFAULT_KEYS, 'techTree', { code: 'Delete', label: 'Delete' });
    expect(r.ok && r.swappedWith).toBe('deleteBuilding');
    expect(r.ok && r.keys.deleteBuilding).toEqual(DEFAULT_KEYS.techTree);
  });

  it('Tab is reserved for every action but its default holder', () => {
    expect(rebind(DEFAULT_KEYS, 'home', { code: 'Tab', label: 'Tab' })).toEqual({ ok: false, reason: 'reserved' });
    const moved = rebind(DEFAULT_KEYS, 'scorePanel', { code: 'KeyP', label: 'P' });
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    const back = rebind(moved.keys, 'scorePanel', { code: 'Tab', label: 'Tab' });
    expect(back.ok && back.keys.scorePanel.code).toBe('Tab');
    expect(validBindings({ ...DEFAULT_KEYS, home: { code: 'Tab', label: 'Tab' }, scorePanel: { code: 'KeyP', label: 'P' } })).toBe(false);
  });
});
