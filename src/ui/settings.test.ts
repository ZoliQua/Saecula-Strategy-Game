import { describe, expect, it } from 'vitest';
import { DEFAULT_KEYS } from './keymap';
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
});
