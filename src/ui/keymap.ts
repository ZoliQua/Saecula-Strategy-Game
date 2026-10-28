import { DEFAULT_PAN_KEYS, RESERVED_KEY_CODES } from '../config/constants';
import { hu } from '../i18n/hu';

/** The remappable actions: only the camera pan for now (the seam future hotkeys join). */
export type KeyAction = 'panUp' | 'panDown' | 'panLeft' | 'panRight';
export const KEY_ACTIONS: readonly KeyAction[] = ['panUp', 'panDown', 'panLeft', 'panRight'];

/** A physical key (`KeyboardEvent.code`) plus the label its `key` gave at bind time (so QWERTZ shows Z on KeyY). */
export interface KeyBinding {
  code: string;
  label: string;
}
export type KeyBindings = Readonly<Record<KeyAction, KeyBinding>>;

export const DEFAULT_KEYS: KeyBindings = DEFAULT_PAN_KEYS;
export const RESERVED_CODES: ReadonlySet<string> = new Set(RESERVED_KEY_CODES);

export type RebindResult = { ok: true; keys: KeyBindings; swappedWith?: KeyAction } | { ok: false; reason: 'reserved' };

/**
 * Binds `action` to `binding`. A reserved code is refused; a code another
 * action holds swaps the two (`swappedWith` names it); the same code is
 * a no-op, apart from taking a changed label.
 */
export function rebind(keys: KeyBindings, action: KeyAction, binding: KeyBinding): RebindResult {
  if (RESERVED_CODES.has(binding.code)) return { ok: false, reason: 'reserved' };
  const current = keys[action];
  if (current.code === binding.code) {
    // The same physical key: keep everything, unless its label changed (another keyboard layout).
    return current.label === binding.label ? { ok: true, keys } : { ok: true, keys: { ...keys, [action]: { code: binding.code, label: binding.label } } };
  }
  const holder = KEY_ACTIONS.find((a) => keys[a].code === binding.code);
  const next: Record<KeyAction, KeyBinding> = { ...keys, [action]: { code: binding.code, label: binding.label } };
  if (holder === undefined) return { ok: true, keys: next };
  next[holder] = keys[action];
  return { ok: true, keys: next, swappedWith: holder };
}

/** True when no code is reserved and no two actions share one (a stored blob must pass this). */
export function validBindings(keys: KeyBindings): boolean {
  const codes = KEY_ACTIONS.map((a) => keys[a].code);
  return new Set(codes).size === codes.length && codes.every((c) => !RESERVED_CODES.has(c));
}

const KEY_NAMES: Readonly<Record<string, string>> = hu.settings.keyNames;

/** The binding a key press gives: a Hungarian name for named keys, the printed character, else the code. */
export function bindingFromEvent(e: Pick<KeyboardEvent, 'code' | 'key'>): KeyBinding {
  const named = KEY_NAMES[e.code];
  const printable = e.key.length === 1 && e.key.trim() !== '';
  return { code: e.code, label: named ?? (printable ? e.key.toLocaleUpperCase('hu') : e.code) };
}

/** The pan keys for the HUD hint, in the familiar up-left-down-right order ("WASD"). */
export function keysHint(keys: KeyBindings): string {
  const labels = (['panUp', 'panLeft', 'panDown', 'panRight'] as const).map((a) => keys[a].label);
  return labels.every((l) => l.length === 1) ? labels.join('') : labels.join('/');
}
