import { z } from 'zod';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { DEFAULT_VOLUMES } from '../config/constants';
import { DEFAULT_KEYS, rebind as rebindKeys, validBindings, type KeyAction, type KeyBinding, type KeyBindings, type RebindResult } from './keymap';

export type VolumeChannel = 'master' | 'music' | 'sfx' | 'notifications';
export const VOLUME_CHANNELS: readonly VolumeChannel[] = ['master', 'music', 'sfx', 'notifications'];

/** The player's settings (UI state, kept in localStorage; never part of a save). Volumes are integers 0..100. */
export interface Settings {
  volume: Readonly<Record<VolumeChannel, number>>;
  muted: boolean;
  keys: KeyBindings;
}

export const DEFAULT_SETTINGS: Settings = { volume: DEFAULT_VOLUMES, muted: false, keys: DEFAULT_KEYS };
export const SETTINGS_KEY = 'isorts.settings.v1';

export function clampVolume(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

// Every field falls back to its default on its own, so a partial or half-broken blob keeps what it can.
const volume = (fallback: number) => z.number().finite().transform(clampVolume).catch(fallback);
const binding = (fallback: KeyBinding) => z.object({ code: z.string().min(1).max(40), label: z.string().min(1).max(40) }).catch(fallback);
const settingsSchema = z.object({
  volume: z
    .object({
      master: volume(DEFAULT_VOLUMES.master),
      music: volume(DEFAULT_VOLUMES.music),
      sfx: volume(DEFAULT_VOLUMES.sfx),
      notifications: volume(DEFAULT_VOLUMES.notifications),
    })
    .catch(DEFAULT_VOLUMES),
  muted: z.boolean().catch(false),
  keys: z
    .object({
      panUp: binding(DEFAULT_KEYS.panUp),
      panDown: binding(DEFAULT_KEYS.panDown),
      panLeft: binding(DEFAULT_KEYS.panLeft),
      panRight: binding(DEFAULT_KEYS.panRight),
    })
    .catch(DEFAULT_KEYS)
    // A clash (two actions on one code, or a reserved code) cannot be repaired field by field.
    .transform((keys): KeyBindings => (validBindings(keys) ? keys : DEFAULT_KEYS)),
});

/** The stored settings; anything unreadable or invalid gives the defaults, and missing fields are filled from them. */
export function loadSettings(storage: Pick<Storage, 'getItem'> | null): Settings {
  try {
    const raw = storage?.getItem(SETTINGS_KEY);
    if (raw === null || raw === undefined) return DEFAULT_SETTINGS;
    const parsed = settingsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Writes the settings; false when there is no storage or it refuses (private mode, quota). */
export function saveSettings(storage: Pick<Storage, 'setItem'> | null, s: Settings): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify({ volume: s.volume, muted: s.muted, keys: s.keys }));
    return true;
  } catch {
    return false;
  }
}

/** `window.localStorage`, or null where even reading it throws (blocked site data, sandboxed frames). */
export function safeLocalStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export interface SettingsStore extends Settings {
  /** Whether the last change reached storage (false: it holds for this session only). */
  persisted: boolean;
  setVolume(ch: VolumeChannel, v: number): void;
  setMuted(m: boolean): void;
  rebind(action: KeyAction, binding: KeyBinding): RebindResult;
  resetDefaults(): void;
}

/** A settings store over `storage`, loaded from it; every change is written back at once. */
export function createSettingsStore(storage: Pick<Storage, 'getItem' | 'setItem'> | null): StoreApi<SettingsStore> {
  return createStore<SettingsStore>()((set, get) => {
    const commit = (next: Settings): void => set({ ...next, persisted: saveSettings(storage, next) });
    const current = (): Settings => {
      const { volume: v, muted, keys } = get();
      return { volume: v, muted, keys };
    };
    return {
      ...loadSettings(storage),
      persisted: true,
      setVolume: (ch, v) => {
        if (!Number.isFinite(v)) return;
        const s = current();
        commit({ ...s, volume: { ...s.volume, [ch]: clampVolume(v) } });
      },
      setMuted: (m) => commit({ ...current(), muted: m }),
      rebind: (action, b) => {
        const s = current();
        const result = rebindKeys(s.keys, action, b);
        if (result.ok && result.keys !== s.keys) commit({ ...s, keys: result.keys });
        return result;
      },
      resetDefaults: () => commit(DEFAULT_SETTINGS),
    };
  });
}

/**
 * The app's settings store. Pinned on globalThis like `uiStore`, so Vite
 * HMR re-evaluations share one instance.
 */
const STORE_KEY = '__isorts_settingsStore__';
interface GlobalHolder {
  [STORE_KEY]?: StoreApi<SettingsStore>;
}
const holder = globalThis as unknown as GlobalHolder;
export const settingsStore: StoreApi<SettingsStore> = holder[STORE_KEY] ?? createSettingsStore(safeLocalStorage());
holder[STORE_KEY] = settingsStore;
