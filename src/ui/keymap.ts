import { DEFAULT_COMMAND_KEYS, DEFAULT_PAN_KEYS, RESERVED_KEY_CODES } from '../config/constants';
import { hu } from '../i18n/hu';

/**
 * The remappable actions: the camera pan (held, read by CameraController's
 * KeyState) and the command keys (pressed, heard through `onKeyAction`).
 */
export type PanAction = 'panUp' | 'panDown' | 'panLeft' | 'panRight';
export type CommandAction = 'home' | 'scorePanel' | 'villagerPanel' | 'techTree' | 'deleteBuilding';
export type KeyAction = PanAction | CommandAction;
export const PAN_ACTIONS: readonly PanAction[] = ['panUp', 'panDown', 'panLeft', 'panRight'];
export const COMMAND_ACTIONS: readonly CommandAction[] = ['home', 'scorePanel', 'villagerPanel', 'techTree', 'deleteBuilding'];
export const KEY_ACTIONS: readonly KeyAction[] = [...PAN_ACTIONS, ...COMMAND_ACTIONS];

/** How the settings card groups the key list ("Kamera", "Parancsok"). */
export interface KeyGroup {
  readonly id: 'camera' | 'commands';
  readonly actions: readonly KeyAction[];
}
export const KEY_GROUPS: readonly KeyGroup[] = [
  { id: 'camera', actions: PAN_ACTIONS },
  { id: 'commands', actions: COMMAND_ACTIONS },
];

/** A physical key (`KeyboardEvent.code`) plus the label its `key` gave at bind time (so QWERTZ shows Z on KeyY). */
export interface KeyBinding {
  code: string;
  label: string;
}
export type KeyBindings = Readonly<Record<KeyAction, KeyBinding>>;

export const DEFAULT_KEYS: KeyBindings = { ...DEFAULT_PAN_KEYS, ...DEFAULT_COMMAND_KEYS };
export const RESERVED_CODES: ReadonlySet<string> = new Set(RESERVED_KEY_CODES);

/**
 * Whether `action` may not hold `code`. A reserved code is refused, except
 * the action's own default (Tab is reserved, yet it is `scorePanel`'s
 * default: that action alone may hold it, and get it back).
 */
function refused(action: KeyAction, code: string): boolean {
  return RESERVED_CODES.has(code) && DEFAULT_KEYS[action].code !== code;
}

export type RebindResult = { ok: true; keys: KeyBindings; swappedWith?: KeyAction } | { ok: false; reason: 'reserved' };

/**
 * Binds `action` to `binding`. A reserved code is refused; a code another
 * action holds swaps the two (`swappedWith` names it); the same code is
 * a no-op, apart from taking a changed label.
 */
export function rebind(keys: KeyBindings, action: KeyAction, binding: KeyBinding): RebindResult {
  if (refused(action, binding.code)) return { ok: false, reason: 'reserved' };
  const current = keys[action];
  if (current.code === binding.code) {
    // The same physical key: keep everything, unless its label changed (another keyboard layout).
    return current.label === binding.label ? { ok: true, keys } : { ok: true, keys: { ...keys, [action]: { code: binding.code, label: binding.label } } };
  }
  const holder = KEY_ACTIONS.find((a) => keys[a].code === binding.code);
  // A swap must not hand the other action a key it may not hold (Tab to anything but scorePanel).
  if (holder !== undefined && refused(holder, current.code)) return { ok: false, reason: 'reserved' };
  const next: Record<KeyAction, KeyBinding> = { ...keys, [action]: { code: binding.code, label: binding.label } };
  if (holder === undefined) return { ok: true, keys: next };
  next[holder] = keys[action];
  return { ok: true, keys: next, swappedWith: holder };
}

/** True when no action holds a code refused to it and no two actions share one (a stored blob must pass this). */
export function validBindings(keys: KeyBindings): boolean {
  const codes = KEY_ACTIONS.map((a) => keys[a].code);
  return new Set(codes).size === codes.length && KEY_ACTIONS.every((a) => !refused(a, keys[a].code));
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
