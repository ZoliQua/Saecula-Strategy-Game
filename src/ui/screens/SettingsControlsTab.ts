import { hu } from '../../i18n/hu';
import { el } from '../dom';
import { bindingFromEvent, KEY_ACTIONS, KEY_GROUPS, type KeyAction } from '../keymap';
import { COMMAND_GESTURES, SCROLL_MODES, settingsStore, type CommandGesture, type ScrollMode, type SettingsStore } from '../settings';
import { Segmented } from './Segmented';
import { rebindNotice, type SettingsNotice } from './settingsView';
import '../setup.css';

const svg = (paths: string, size = 14): string =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

/** A glyph per action in the key list. */
const ACTION_GLYPHS: Readonly<Record<KeyAction, string>> = {
  panUp: svg('<path d="M12 18V6M7 11l5-5 5 5"/>'),
  panDown: svg('<path d="M12 6v12M7 13l5 5 5-5"/>'),
  panLeft: svg('<path d="M18 12H6M11 7l-5 5 5 5"/>'),
  panRight: svg('<path d="M6 12h12M13 7l5 5-5 5"/>'),
  home: svg('<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10v9h11v-9M10 19v-5h4v5"/>'),
  scorePanel: svg('<path d="M8 4.5h8v4a4 4 0 0 1-8 0Z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 12.5V16M8.5 19.5h7M10 16h4"/>'),
  villagerPanel: svg('<circle cx="12" cy="7.5" r="3"/><path d="M6 19.5c0-3.6 2.7-6 6-6s6 2.4 6 6"/>'),
  techTree: svg('<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M6 8v2.5a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V8M12 13.5V16"/>'),
  deleteBuilding: svg('<path d="M4 7h16M9.5 7V4.5h5V7"/><path d="M6.5 7 7.5 20h9l1-13"/><path d="M10.5 11v5.5M13.5 11v5.5"/>'),
};
const ICONS = {
  pointer: svg('<path d="M6 3.5 18 13l-5.3.8 3 6.2-2.4 1.1-3-6.2L6 18.4Z"/>', 16),
  keyboard: svg('<rect x="2.8" y="6" width="18.4" height="12" rx="2.2"/><path d="M6.5 9.8h.01M9.8 9.8h.01M13.1 9.8h.01M16.4 9.8h.01M7.5 14.2h9"/>', 16),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', 13),
} as const;

interface KeyRow {
  readonly row: HTMLButtonElement;
  readonly cap: HTMLElement;
}

/** What the controls tab needs from the card around it. */
export interface ControlsTabHost {
  /** Runs a store change and reports a refused write. */
  after(change: () => void): void;
  notice(n: SettingsNotice | null): void;
  /** A key capture started (true) or ended: the Esc hint reads "Mégse" while one runs. */
  capturing(on: boolean): void;
}

/**
 * The settings card's "Irányítás" tab: the command gesture, the scroll
 * mode, then every key binding, grouped "Kamera" / "Parancsok". Clicking
 * a key row captures the next key press; Esc then only cancels the capture.
 */
export class SettingsControlsTab {
  readonly root: HTMLElement;
  private readonly gesture: Segmented<CommandGesture>;
  private readonly scroll: Segmented<ScrollMode>;
  private readonly scrollHint: HTMLElement;
  private readonly keyRows = new Map<KeyAction, KeyRow>();
  /** The action waiting for a key press. */
  private capturingAction: KeyAction | null = null;

  constructor(private readonly host: ControlsTabHost) {
    const s = settingsStore.getState();
    const t = hu.settings;
    this.gesture = new Segmented(
      'gesture',
      t.gesture,
      COMMAND_GESTURES.map((g) => ({ value: g, label: t.gestures[g] })),
      s.controls.commandGesture,
      (v) => this.host.after(() => settingsStore.getState().setControls({ commandGesture: v })),
    );
    this.scroll = new Segmented(
      'scroll',
      t.scroll,
      SCROLL_MODES.map((m) => ({ value: m, label: t.scrollModes[m] })),
      s.controls.scrollMode,
      (v) => this.host.after(() => settingsStore.getState().setControls({ scrollMode: v })),
    );
    this.scrollHint = el('p', { class: 'set-hint' });
    const pointer = el(
      'section',
      { class: 'set-section', style: '--i:0' },
      el('header', { class: 'set-section-head' }, el('span', { class: 'set-section-icon', html: ICONS.pointer }), el('h3', {}, t.mouse)),
      el(
        'div',
        { class: 'set-panel set-controls' },
        el('div', { class: 'set-control' }, el('span', { class: 'set-label' }, t.gesture), this.gesture.root),
        el('p', { class: 'set-hint' }, t.gestureHint),
        el('div', { class: 'set-control' }, el('span', { class: 'set-label' }, t.scroll), this.scroll.root),
        this.scrollHint,
      ),
    );
    const keys = el(
      'section',
      { class: 'set-section', style: '--i:1' },
      el('header', { class: 'set-section-head' }, el('span', { class: 'set-section-icon', html: ICONS.keyboard }), el('h3', {}, t.keys)),
      ...KEY_GROUPS.map((g) =>
        el('div', { class: 'set-key-group' }, el('h4', { class: 'set-key-group-title' }, t.keyGroups[g.id]), el('div', { class: 'set-keys' }, ...g.actions.map((a) => this.keyRow(a)))),
      ),
      el('p', { class: 'set-fixed' }, el('span', { class: 'set-fixed-icon', html: ICONS.lock }), t.fixedKeys),
    );
    this.root = el('div', { class: 'set-tab-content' }, pointer, keys);
    // Using any other control ends a capture, so its own keys work again.
    this.root.addEventListener('pointerdown', this.onOutsideCapture);
    this.root.addEventListener('focusin', this.onOutsideCapture);
  }

  get isCapturing(): boolean {
    return this.capturingAction !== null;
  }

  sync(s: SettingsStore): void {
    this.gesture.set(s.controls.commandGesture);
    this.scroll.set(s.controls.scrollMode);
    this.scrollHint.textContent = hu.settings.scrollHint[s.controls.scrollMode];
    for (const [action, { cap }] of this.keyRows) {
      if (this.capturingAction !== action) cap.textContent = s.keys[action].label;
    }
  }

  stopCapture(): void {
    if (this.capturingAction === null) return;
    window.removeEventListener('keydown', this.onCaptureKey, true);
    this.keyRows.get(this.capturingAction)?.row.classList.remove('capturing', 'refused');
    this.capturingAction = null;
    this.host.capturing(false);
    this.sync(settingsStore.getState());
  }

  /** The reset's amber pop on every keycap. */
  flashAll(): void {
    for (const a of KEY_ACTIONS) this.flash(a);
  }

  private keyRow(action: KeyAction): HTMLElement {
    const cap = el('kbd', { class: 'keycap' });
    // A fixed second key (Backspace for deleting) shows beside the bound one, locked.
    const second = hu.settings.secondaryKeys[action];
    const row = el(
      'button',
      { class: 'set-key', type: 'button' },
      el('span', { class: 'set-key-icon', html: ACTION_GLYPHS[action] }),
      el('span', { class: 'set-key-label' }, hu.settings.actions[action]),
      cap,
      second === undefined ? null : el('kbd', { class: 'keycap keycap-fixed', title: hu.settings.secondaryTip }, second),
    );
    row.addEventListener('click', () => (this.capturingAction === action ? this.stopCapture() : this.startCapture(action)));
    this.keyRows.set(action, { row, cap });
    return row;
  }

  private startCapture(action: KeyAction): void {
    this.stopCapture();
    this.capturingAction = action;
    const row = this.keyRows.get(action);
    row?.row.classList.add('capturing');
    if (row) row.cap.textContent = '…';
    this.host.capturing(true);
    this.host.notice({ text: hu.settings.pressKey, tone: 'info' });
    // Capture phase on window, ahead of the card's Esc, KeyState and Phaser: the press is the binding, nothing else.
    window.addEventListener('keydown', this.onCaptureKey, true);
  }

  private readonly onCaptureKey = (e: KeyboardEvent): void => {
    const action = this.capturingAction;
    if (action === null) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    // An IME composition is not a key choice.
    if (e.repeat || e.isComposing || e.key === 'Process') return;
    if (e.code === 'Escape') {
      this.stopCapture();
      this.host.notice(null);
      return;
    }
    const result = settingsStore.getState().rebind(action, bindingFromEvent(e));
    if (!result.ok) {
      // A reserved key: stay in capture mode, and shake the row.
      const row = this.keyRows.get(action)?.row;
      row?.classList.remove('refused');
      void row?.offsetWidth;
      row?.classList.add('refused');
      this.host.notice(rebindNotice(result, e.code));
      return;
    }
    this.stopCapture();
    for (const a of result.swappedWith === undefined ? [action] : [action, result.swappedWith]) this.flash(a);
    this.host.notice(settingsStore.getState().persisted ? rebindNotice(result) : { text: hu.settings.notSaved, tone: 'error' });
  };

  private readonly onOutsideCapture = (e: Event): void => {
    if (this.capturingAction === null) return;
    const row = this.keyRows.get(this.capturingAction)?.row;
    if (row && e.target instanceof Node && row.contains(e.target)) return;
    this.stopCapture();
    this.host.notice(null);
  };

  /** A short amber pop on a keycap that just changed. */
  private flash(action: KeyAction): void {
    const cap = this.keyRows.get(action)?.cap;
    if (!cap) return;
    cap.classList.remove('bound');
    void cap.offsetWidth;
    cap.classList.add('bound');
  }
}
