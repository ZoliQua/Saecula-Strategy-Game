import { audio } from '../../audio/AudioManager';
import { hu } from '../../i18n/hu';
import { el, uiRoot } from '../dom';
import { bindingFromEvent, KEY_ACTIONS, type KeyAction } from '../keymap';
import { settingsStore, VOLUME_CHANNELS, type SettingsStore, type VolumeChannel } from '../settings';
import { bindModalKeys, GLYPHS } from './modalKeys';
import { rebindNotice, type SettingsNotice } from './settingsView';
import '../hud.css';
import '../screens.css';
import '../pause.css';
import '../settings.css';

const ICONS = {
  speaker: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4Z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.2 6.5a8 8 0 0 1 0 11"/></svg>`,
  muted: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4Z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/></svg>`,
  keyboard: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2.8" y="6" width="18.4" height="12" rx="2.2"/><path d="M6.5 9.8h.01M9.8 9.8h.01M13.1 9.8h.01M16.4 9.8h.01M7.5 14.2h9"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`,
  reset: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/></svg>`,
  arrows: { panUp: 'M12 18V6M7 11l5-5 5 5', panDown: 'M12 6v12M7 13l5 5 5-5', panLeft: 'M18 12H6M11 7l-5 5 5 5', panRight: 'M6 12h12M13 7l5 5-5 5' },
} as const;

const arrowGlyph = (a: KeyAction): string =>
  `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS.arrows[a]}"/></svg>`;

interface VolumeRow {
  readonly input: HTMLInputElement;
  readonly value: HTMLElement;
}
interface KeyRow {
  readonly row: HTMLButtonElement;
  readonly cap: HTMLElement;
}

/**
 * The settings card (from the main menu and the pause): a slider per
 * volume channel, the mute switch, and a key row per camera pan action.
 * Every change goes straight to `settingsStore` (which persists it).
 * Clicking a key row captures the next key press; Esc then only cancels
 * the capture. Otherwise Esc goes back.
 */
export class SettingsScreen {
  private readonly root: HTMLElement;
  private readonly card: HTMLElement;
  private readonly audio: HTMLElement;
  private readonly muteBtn: HTMLButtonElement;
  private readonly muteIcon: HTMLElement;
  private readonly status: HTMLElement;
  private readonly escLabel: HTMLElement;
  private readonly volumes = new Map<VolumeChannel, VolumeRow>();
  private readonly keyRows = new Map<KeyAction, KeyRow>();
  private readonly unbindKeys: () => void;
  private readonly unsubscribe: () => void;
  /** The action waiting for a key press. */
  private capturing: KeyAction | null = null;

  constructor(private readonly onBack: () => void) {
    audio().playSFX('ui_panel_open');
    this.muteIcon = el('span', { class: 'set-mute-icon' });
    this.muteBtn = el('button', { class: 'set-switch', type: 'button', role: 'switch', 'aria-checked': 'false', 'aria-label': hu.settings.mute }, el('i', {}));
    this.muteBtn.addEventListener('click', () => this.after(() => settingsStore.getState().setMuted(!settingsStore.getState().muted)));
    this.audio = el(
      'section',
      { class: 'set-section', style: '--i:0' },
      el(
        'header',
        { class: 'set-section-head' },
        el('span', { class: 'set-section-icon', html: ICONS.speaker }),
        el('h3', {}, hu.settings.audio),
        el('label', { class: 'set-mute' }, this.muteIcon, el('span', {}, hu.settings.mute), this.muteBtn),
      ),
      el('div', { class: 'set-panel set-volumes' }, ...VOLUME_CHANNELS.map((ch) => this.volumeRow(ch))),
    );
    const keys = el(
      'section',
      { class: 'set-section', style: '--i:1' },
      el('header', { class: 'set-section-head' }, el('span', { class: 'set-section-icon', html: ICONS.keyboard }), el('h3', {}, hu.settings.keys)),
      el('div', { class: 'set-keys' }, ...KEY_ACTIONS.map((a) => this.keyRow(a))),
      el('p', { class: 'set-fixed' }, el('span', { class: 'set-fixed-icon', html: ICONS.lock }), hu.settings.fixedKeys),
    );
    this.status = el('div', { class: 'slots-status set-status', role: 'status', 'aria-live': 'polite' });
    const back = el(
      'button',
      { class: 'btn btn-ghost btn-back slots-back', type: 'button' },
      el('span', { class: 'arrow', html: GLYPHS.back }),
      el('span', {}, hu.common.back),
    );
    back.addEventListener('click', () => this.back());
    const reset = el('button', { class: 'btn btn-ghost set-reset', type: 'button' }, el('span', { class: 'arrow', html: ICONS.reset }), el('span', {}, hu.settings.reset));
    reset.addEventListener('click', () => this.reset());
    this.escLabel = el('span', {}, hu.common.back);
    this.card = el(
      'div',
      { class: 'glass settings-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': hu.settings.title },
      el(
        'div',
        { class: 'pause-head' },
        el('div', { class: 'eyebrow pause-kicker' }, hu.settings.kicker),
        el('h2', { class: 'pause-title' }, hu.settings.title),
        el('div', { class: 'pause-ornament', 'aria-hidden': 'true' }, el('span', {}), el('i', {}), el('span', {})),
      ),
      el('div', { class: 'set-body' }, this.audio, keys),
      this.status,
      el('div', { class: 'slots-foot set-foot' }, back, el('div', { class: 'pause-foot' }, el('kbd', {}, 'Esc'), this.escLabel), reset),
    );
    this.root = el('div', { class: 'screen pause-layer' }, this.card);
    uiRoot().append(this.root);
    this.unbindKeys = bindModalKeys(this.card, () => this.back());
    // Using any other control (a slider, the switch) ends a capture, so its own keys work again.
    this.card.addEventListener('pointerdown', this.onOutsideCapture);
    this.card.addEventListener('focusin', this.onOutsideCapture);
    this.unsubscribe = settingsStore.subscribe((s) => this.sync(s));
    this.sync(settingsStore.getState());
    this.volumes.get('master')?.input.focus({ preventScroll: true });
  }

  /** Plays the exit animation (the owner removes the card shortly after). */
  leave(): void {
    this.stopCapture();
    this.root.classList.add('leaving');
    this.root.inert = true;
    this.unbindKeys();
  }

  destroy(): void {
    this.stopCapture();
    this.unbindKeys();
    this.unsubscribe();
    this.root.remove();
  }

  private volumeRow(ch: VolumeChannel): HTMLElement {
    const id = `set-vol-${ch}`;
    const input = el('input', { id, class: 'set-range', type: 'range', min: 0, max: 100, step: 1 });
    input.addEventListener('input', () => this.after(() => settingsStore.getState().setVolume(ch, Number(input.value))));
    const value = el('output', { class: 'set-value', for: id });
    this.volumes.set(ch, { input, value });
    return el('div', { class: `set-volume${ch === 'master' ? ' master' : ''}` }, el('label', { class: 'set-label', for: id }, hu.settings.volumes[ch]), input, value);
  }

  private keyRow(action: KeyAction): HTMLElement {
    const cap = el('kbd', { class: 'keycap' });
    const row = el(
      'button',
      { class: 'set-key', type: 'button' },
      el('span', { class: 'set-key-icon', html: arrowGlyph(action) }),
      el('span', { class: 'set-key-label' }, hu.settings.actions[action]),
      cap,
    );
    row.addEventListener('click', () => (this.capturing === action ? this.stopCapture() : this.startCapture(action)));
    this.keyRows.set(action, { row, cap });
    return row;
  }

  /** Mirrors the store into the controls (after any change, including a reset). */
  private sync(s: SettingsStore): void {
    for (const [ch, { input, value }] of this.volumes) {
      const v = s.volume[ch];
      if (input.value !== String(v)) input.value = String(v);
      input.style.setProperty('--fill', `${v}%`);
      value.textContent = `${v}%`;
    }
    this.muteBtn.setAttribute('aria-checked', String(s.muted));
    this.muteIcon.innerHTML = s.muted ? ICONS.muted : ICONS.speaker;
    this.audio.classList.toggle('muted', s.muted);
    for (const [action, { cap }] of this.keyRows) {
      if (this.capturing !== action) cap.textContent = s.keys[action].label;
    }
  }

  /** Runs a store change; a change storage refused is still applied, and the card says it holds for this session only. */
  private after(change: () => void): void {
    change();
    if (!settingsStore.getState().persisted) this.notice({ text: hu.settings.notSaved, tone: 'error' });
  }

  private startCapture(action: KeyAction): void {
    this.stopCapture();
    this.capturing = action;
    const row = this.keyRows.get(action);
    row?.row.classList.add('capturing');
    if (row) row.cap.textContent = '…';
    this.escLabel.textContent = hu.common.cancel;
    this.notice({ text: hu.settings.pressKey, tone: 'info' });
    // Capture phase on window, ahead of the card's Esc, KeyState and Phaser: the press is the binding, nothing else.
    window.addEventListener('keydown', this.onCaptureKey, true);
  }

  private stopCapture(): void {
    if (this.capturing === null) return;
    window.removeEventListener('keydown', this.onCaptureKey, true);
    const row = this.keyRows.get(this.capturing);
    row?.row.classList.remove('capturing', 'refused');
    this.capturing = null;
    this.escLabel.textContent = hu.common.back;
    this.sync(settingsStore.getState());
  }

  private readonly onCaptureKey = (e: KeyboardEvent): void => {
    const action = this.capturing;
    if (action === null) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    // An IME composition is not a key choice.
    if (e.repeat || e.isComposing || e.key === 'Process') return;
    if (e.code === 'Escape') {
      this.stopCapture();
      this.notice(null);
      return;
    }
    const result = settingsStore.getState().rebind(action, bindingFromEvent(e));
    if (!result.ok) {
      // A reserved key: stay in capture mode, and shake the row.
      const row = this.keyRows.get(action)?.row;
      row?.classList.remove('refused');
      void row?.offsetWidth;
      row?.classList.add('refused');
      this.notice(rebindNotice(result));
      return;
    }
    this.stopCapture();
    for (const a of result.swappedWith === undefined ? [action] : [action, result.swappedWith]) this.flash(a);
    this.notice(settingsStore.getState().persisted ? rebindNotice(result) : { text: hu.settings.notSaved, tone: 'error' });
  };

  private readonly onOutsideCapture = (e: Event): void => {
    if (this.capturing === null) return;
    const row = this.keyRows.get(this.capturing)?.row;
    if (row && e.target instanceof Node && row.contains(e.target)) return;
    this.stopCapture();
    this.notice(null);
  };

  /** A short amber pop on a keycap that just changed. */
  private flash(action: KeyAction): void {
    const cap = this.keyRows.get(action)?.cap;
    if (!cap) return;
    cap.classList.remove('bound');
    void cap.offsetWidth;
    cap.classList.add('bound');
  }

  private reset(): void {
    this.stopCapture();
    this.after(() => settingsStore.getState().resetDefaults());
    if (settingsStore.getState().persisted) this.notice({ text: hu.settings.resetDone, tone: 'ok' });
    for (const a of KEY_ACTIONS) this.flash(a);
  }

  private back(): void {
    if (this.capturing !== null) {
      this.stopCapture();
      this.notice(null);
    }
    this.onBack();
  }

  private notice(n: SettingsNotice | null): void {
    this.status.replaceChildren();
    if (n) this.status.append(el('div', { class: `slots-notice set-notice ${n.tone}` }, n.text));
  }
}
