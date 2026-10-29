import type { StoreApi } from 'zustand/vanilla';
import { SECONDARY_COMMAND_CODES } from '../../config/constants';
import type { CommandAction } from '../../ui/keymap';
import { settingsStore, type SettingsStore } from '../../ui/settings';
import { isTyping } from '../systems/KeyState';

/** The slice of a Phaser scene `onKeyAction` uses. */
export interface KeyActionHost {
  readonly sys: { isActive(): boolean };
  readonly events: { once(event: 'shutdown', fn: () => void): unknown };
}

export interface KeyActionOptions {
  /** Where key events are heard (default: window); tests pass a fake. */
  readonly target?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  readonly store?: StoreApi<SettingsStore>;
  /** Whether a modal glass card is open (default: one with aria-modal is in the document). */
  readonly modalOpen?: () => boolean;
}

/** The fixed second key of `action` (Backspace for deleteBuilding), if it has one. */
export function secondaryCode(action: CommandAction): string | undefined {
  return (SECONDARY_COMMAND_CODES as Partial<Record<CommandAction, string>>)[action];
}

/** A modal glass card (pause, settings, slots, game over) is in the document. */
function domModalOpen(): boolean {
  return typeof document !== 'undefined' && document.querySelector('[aria-modal="true"]') !== null;
}

/**
 * The one place game code listens for a remappable command key: calls
 * `handler` when `action`'s bound key (read at each press, so a rebind
 * applies at once) or its fixed second key (secondaryCode) goes down
 * while `scene` runs. The listener sits on
 * window and runs synchronously, so its preventDefault stops the
 * browser's own use of the key (Tab's focus move). A press is skipped
 * while typing in a field, with Ctrl / Cmd / Alt held (browser
 * shortcuts), when a glass card already handled it, while a modal card
 * is open (its Tab must keep moving focus), or while the scene is paused. Repeats reach the handler (`event.repeat`): one that arms
 * something ignores them. Unwired on shutdown, or by the returned
 * function. The pan keys are held, not pressed: they keep KeyState.
 */
export function onKeyAction(
  scene: KeyActionHost,
  action: CommandAction,
  handler: (event: KeyboardEvent) => void,
  options: KeyActionOptions = {},
): () => void {
  const target = options.target ?? window;
  const store = options.store ?? settingsStore;
  const modalOpen = options.modalOpen ?? domModalOpen;
  const second = secondaryCode(action);
  const onKeyDown = (raw: Event): void => {
    const e = raw as KeyboardEvent;
    if (e.code !== store.getState().keys[action].code && e.code !== second) return;
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
    if (!scene.sys.isActive() || modalOpen()) return;
    e.preventDefault();
    handler(e);
  };
  target.addEventListener('keydown', onKeyDown);
  let wired = true;
  const off = (): void => {
    if (!wired) return;
    wired = false;
    target.removeEventListener('keydown', onKeyDown);
  };
  scene.events.once('shutdown', off);
  return off;
}
