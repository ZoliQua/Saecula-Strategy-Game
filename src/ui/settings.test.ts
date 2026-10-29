import { describe, expect, it } from 'vitest';
import { DEFAULT_KEYS, rebind, validBindings } from './keymap';
import { createSettingsStore, DEFAULT_SETTINGS, loadSettings, saveSettings, SETTINGS_KEY } from './settings';

const memory = (blob: string | null = null) => {
  const data = new Map<string, string>();
  if (blob !== null) data.set(SETTINGS_KEY, blob);
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
};

describe('settings', () => {
  it('missing blob → defaults', () => {
    expect(loadSettings(memory())).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("'{' → defaults", () => {
    expect(loadSettings(memory('{'))).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(memory('"x"'))).toEqual(DEFAULT_SETTINGS);
  });

  it('volume 250 → clamped 100', () => {
    const s = loadSettings(memory(JSON.stringify({ volume: { master: 250, music: -4, sfx: 33.6 } })));
    expect(s.volume).toEqual({ master: 100, music: 0, sfx: 34, notifications: 80 });
  });

  it('partial blob keeps given fields and fills the rest', () => {
    const s = loadSettings(memory(JSON.stringify({ muted: true, keys: { panUp: { code: 'KeyI', label: 'I' } } })));
    expect(s.muted).toBe(true);
    expect(s.volume).toEqual(DEFAULT_SETTINGS.volume);
    expect(s.keys).toEqual({ ...DEFAULT_KEYS, panUp: { code: 'KeyI', label: 'I' } });
  });

  it('getItem throws → defaults, no throw', () => {
    const storage = {
      getItem: (): string | null => {
        throw new Error('denied');
      },
    };
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
  });

  it('setItem throws → saveSettings false, store still updates', () => {
    const storage = {
      getItem: () => null,
      setItem: (): void => {
        throw new Error('quota');
      },
    };
    expect(saveSettings(storage, DEFAULT_SETTINGS)).toBe(false);
    const store = createSettingsStore(storage);
    store.getState().setVolume('music', 12);
    expect(store.getState().volume.music).toBe(12);
    expect(store.getState().persisted).toBe(false);
  });

  it('two actions on one code in a stored blob → defaults for keys', () => {
    const keys = { ...DEFAULT_KEYS, panDown: { code: 'KeyW', label: 'W' } };
    const s = loadSettings(memory(JSON.stringify({ volume: { master: 40 }, keys })));
    expect(s.keys).toEqual(DEFAULT_KEYS);
    expect(s.volume.master).toBe(40);
  });

  it('a reserved code in a stored blob → defaults for keys', () => {
    const s = loadSettings(memory(JSON.stringify({ keys: { ...DEFAULT_KEYS, panLeft: { code: 'Escape', label: 'ESC' } } })));
    expect(s.keys).toEqual(DEFAULT_KEYS);
  });

  it('every store change persists, and the stored blob loads back', () => {
    const storage = memory();
    const store = createSettingsStore(storage);
    store.getState().setVolume('sfx', 41.4);
    store.getState().setMuted(true);
    const r = store.getState().rebind('panUp', { code: 'KeyD', label: 'D' });
    expect(r.ok && r.swappedWith).toBe('panRight');
    expect(store.getState().persisted).toBe(true);
    const back = loadSettings(storage);
    expect(back.volume.sfx).toBe(41);
    expect(back.muted).toBe(true);
    expect(back.keys.panUp.code).toBe('KeyD');
    expect(back.keys.panRight.code).toBe('KeyW');
    store.getState().resetDefaults();
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
  });

  it('setting a volume to its current value writes and notifies nothing', () => {
    const storage = memory();
    let writes = 0;
    const store = createSettingsStore({ getItem: storage.getItem, setItem: (k, v) => (writes++, storage.setItem(k, v)) });
    let notified = 0;
    store.subscribe(() => notified++);
    store.getState().setVolume('music', 60.2);
    store.getState().setVolume('music', 60);
    expect(writes).toBe(0);
    expect(notified).toBe(0);
    store.getState().setVolume('music', 61);
    expect(writes).toBe(1);
    expect(notified).toBe(1);
  });

  it('a refused rebind changes nothing', () => {
    const store = createSettingsStore(memory());
    expect(store.getState().rebind('panUp', { code: 'Tab', label: 'TAB' })).toEqual({ ok: false, reason: 'reserved' });
    expect(store.getState().keys).toEqual(DEFAULT_KEYS);
  });

  it('an M6 v1 blob without controls (and without the command keys) loads with the defaults', () => {
    const m6 = { volume: { master: 40, music: 60, sfx: 80, notifications: 80 }, muted: false, keys: { ...DEFAULT_PAN_KEYS_ONLY, panUp: { code: 'KeyI', label: 'I' } } };
    const s = loadSettings(memory(JSON.stringify(m6)));
    expect(s.controls).toEqual({ commandGesture: 'ctrl', scrollMode: 'auto' });
    expect(s.keys.panUp.code).toBe('KeyI');
    expect(s.keys.deleteBuilding).toEqual(DEFAULT_KEYS.deleteBuilding);
    expect(s.keys.scorePanel).toEqual(DEFAULT_KEYS.scorePanel);
    expect(s.volume.master).toBe(40);
  });

  it('an M6 blob whose pan key sits on a new default command key keeps it; the command key takes the freed key', () => {
    const s = loadSettings(memory(JSON.stringify({ keys: { ...DEFAULT_PAN_KEYS_ONLY, panUp: { code: 'KeyH', label: 'H' } } })));
    expect(s.keys.panUp).toEqual({ code: 'KeyH', label: 'H' });
    expect(s.keys.home).toEqual(DEFAULT_KEYS.panUp);
    expect(validBindings(s.keys)).toBe(true);
  });

  it('a full stored key map loads back exactly', () => {
    const r = rebind(DEFAULT_KEYS, 'techTree', { code: 'KeyH', label: 'H' });
    const r2 = r.ok ? rebind(r.keys, 'panUp', { code: 'KeyT', label: 'T' }) : r;
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(loadSettings(memory(JSON.stringify({ keys: r2.keys }))).keys).toEqual(r2.keys);
  });

  it('a broken controls field falls back per field', () => {
    const s = loadSettings(memory(JSON.stringify({ controls: { commandGesture: 'meta', scrollMode: 'sideways' } })));
    expect(s.controls).toEqual({ commandGesture: 'meta', scrollMode: 'auto' });
    expect(loadSettings(memory(JSON.stringify({ controls: 7 }))).controls).toEqual(DEFAULT_SETTINGS.controls);
  });

  it('setControls persists, merges the patch, and a reset restores both tabs', () => {
    const storage = memory();
    const store = createSettingsStore(storage);
    store.getState().setControls({ commandGesture: 'alt' });
    store.getState().setControls({ scrollMode: 'pan' });
    expect(store.getState().controls).toEqual({ commandGesture: 'alt', scrollMode: 'pan' });
    expect(loadSettings(storage).controls).toEqual({ commandGesture: 'alt', scrollMode: 'pan' });
    store.getState().rebind('home', { code: 'KeyJ', label: 'J' });
    store.getState().resetDefaults();
    expect(store.getState().controls).toEqual(DEFAULT_SETTINGS.controls);
    expect(store.getState().keys).toEqual(DEFAULT_KEYS);
  });
});


describe('settings: stored key maps (fix round 1)', () => {
  const roundTrip = (steps: [Parameters<typeof rebind>[1], string][]) => {
    const storage = memory();
    const store = createSettingsStore(storage);
    for (const [action, code] of steps) {
      const r = store.getState().rebind(action, { code, label: code });
      expect(r.ok, `${action} → ${code}`).toBe(true);
    }
    expect(loadSettings(storage).keys).toEqual(store.getState().keys);
  };

  it('villagerPanel → Q, then scorePanel → V survives a reload', () => {
    roundTrip([
      ['villagerPanel', 'KeyQ'],
      ['scorePanel', 'KeyV'],
    ]);
  });

  it('scorePanel on T after techTree moved, and on Delete after deleteBuilding moved, survive a reload', () => {
    roundTrip([
      ['techTree', 'KeyJ'],
      ['scorePanel', 'KeyT'],
    ]);
    roundTrip([
      ['deleteBuilding', 'KeyK'],
      ['scorePanel', 'Delete'],
    ]);
  });

  it('a partial blob whose given codes take several defaults still fills every action', () => {
    const s = loadSettings(memory(JSON.stringify({ keys: { panUp: { code: 'KeyH', label: 'H' }, panDown: { code: 'KeyT', label: 'T' } } })));
    expect(validBindings(s.keys)).toBe(true);
    expect(s.keys.panUp.code).toBe('KeyH');
    expect(s.keys.panDown.code).toBe('KeyT');
    expect(s.keys.scorePanel.code).toBe('Tab');
  });
});

const DEFAULT_PAN_KEYS_ONLY = {
  panUp: DEFAULT_KEYS.panUp,
  panDown: DEFAULT_KEYS.panDown,
  panLeft: DEFAULT_KEYS.panLeft,
  panRight: DEFAULT_KEYS.panRight,
};
