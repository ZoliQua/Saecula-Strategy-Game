import { z } from 'zod';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { DEFAULT_CONTROLS, DEFAULT_VOLUMES } from '../config/constants';
import { DEFAULT_KEYS, KEY_ACTIONS, rebind as rebindKeys, validBindings, type KeyAction, type KeyBinding, type KeyBindings, type RebindResult } from './keymap';

export type VolumeChannel = 'master' | 'music' | 'sfx' | 'notifications';
export const VOLUME_CHANNELS: readonly VolumeChannel[] = ['master', 'music', 'sfx', 'notifications'];

/** Which modifier turns a left click into a command (the right button always gives one); 'none': only the right button. */
export type CommandGesture = 'ctrl' | 'meta' | 'alt' | 'none';
export const COMMAND_GESTURES: readonly CommandGesture[] = ['ctrl', 'meta', 'alt', 'none'];
/** What the wheel / two-finger swipe does: 'auto' tells a trackpad (pan) from a mouse wheel (zoom); pinch always zooms. */
export type ScrollMode = 'auto' | 'zoom' | 'pan';
export const SCROLL_MODES: readonly ScrollMode[] = ['auto', 'zoom', 'pan'];

export interface ControlSettings {
  commandGesture: CommandGesture;
  scrollMode: ScrollMode;
}

/** The player's settings (UI state, kept in localStorage; never part of a save). Volumes are integers 0..100. */
export interface Settings {
  volume: Readonly<Record<VolumeChannel, number>>;
  muted: boolean;
  keys: KeyBindings;
  controls: Readonly<ControlSettings>;
}

export const DEFAULT_SETTINGS: Settings = { volume: DEFAULT_VOLUMES, muted: false, keys: DEFAULT_KEYS, controls: DEFAULT_CONTROLS };
export const SETTINGS_KEY = 'isorts.settings.v1';

export function clampVolume(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

// Every field falls back to its default on its own, so a partial or half-broken blob keeps what it can.
const volume = (fallback: number) => z.number().finite().transform(clampVolume).catch(fallback);
const binding = z.object({ code: z.string().min(1).max(40), label: z.string().min(1).max(40) });

/**
 * The stored bindings over the defaults. Missing actions (an M6 blob has
 * only the pan keys) keep their default; a stored key that a missing
 * action's default also uses wins, and that action takes the key it
 * freed (the fold is a chain of `rebind` swaps, so a full valid map comes
 * back exactly). A stored clash or reserved code cannot be repaired: the
 * defaults.
 */
function mergeKeys(stored: { readonly [A in KeyAction]?: KeyBinding | undefined }): KeyBindings {
  const given = KEY_ACTIONS.filter((a) => stored[a] !== undefined);
  const codes = given.map((a) => stored[a]?.code);
  if (new Set(codes).size !== codes.length) return DEFAULT_KEYS;
  let keys = DEFAULT_KEYS;
  for (const a of given) {
    const b = stored[a];
    if (!b) continue;
    const r = rebindKeys(keys, a, b);
    if (!r.ok) return DEFAULT_KEYS;
    keys = r.keys;
  }
  return validBindings(keys) ? keys : DEFAULT_KEYS;
}
const keyFields = Object.fromEntries(KEY_ACTIONS.map((a) => [a, binding.optional().catch(undefined)])) as Record<
  KeyAction,
  z.ZodCatch<z.ZodOptional<typeof binding>>
>;
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
    .object(keyFields)
    .catch({})
    .transform((stored): KeyBindings => mergeKeys(stored)),
  controls: z
    .object({
      commandGesture: z.enum(['ctrl', 'meta', 'alt', 'none']).catch(DEFAULT_CONTROLS.commandGesture),
      scrollMode: z.enum(['auto', 'zoom', 'pan']).catch(DEFAULT_CONTROLS.scrollMode),
    })
    .catch(DEFAULT_CONTROLS),
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
    storage.setItem(SETTINGS_KEY, JSON.stringify({ volume: s.volume, muted: s.muted, keys: s.keys, controls: s.controls }));
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
  setControls(patch: Partial<ControlSettings>): void;
  /** Restores every setting (both tabs of the card). */
  resetDefaults(): void;
}

/** A settings store over `storage`, loaded from it; every change is written back at once. */
export function createSettingsStore(storage: Pick<Storage, 'getItem' | 'setItem'> | null): StoreApi<SettingsStore> {
  return createStore<SettingsStore>()((set, get) => {
    const commit = (next: Settings): void => set({ ...next, persisted: saveSettings(storage, next) });
    const current = (): Settings => {
      const { volume: v, muted, keys, controls } = get();
      return { volume: v, muted, keys, controls };
    };
    return {
      ...loadSettings(storage),
      persisted: true,
      setVolume: (ch, v) => {
        if (!Number.isFinite(v)) return;
        const s = current();
        const next = clampVolume(v);
        // A slider drag fires per pixel: an unchanged value neither writes nor notifies (Task 8's audio subscribes).
        if (s.volume[ch] === next) return;
        commit({ ...s, volume: { ...s.volume, [ch]: next } });
      },
      setMuted: (m) => commit({ ...current(), muted: m }),
      rebind: (action, b) => {
        const s = current();
        const result = rebindKeys(s.keys, action, b);
        if (result.ok && result.keys !== s.keys) commit({ ...s, keys: result.keys });
        return result;
      },
      setControls: (patch) => {
        const s = current();
        const next = { ...s.controls, ...patch };
        if (next.commandGesture === s.controls.commandGesture && next.scrollMode === s.controls.scrollMode) return;
        commit({ ...s, controls: next });
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
