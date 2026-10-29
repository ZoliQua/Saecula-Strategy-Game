import { audio } from '../../audio/AudioManager';
import { hu } from '../../i18n/hu';
import { el, uiRoot } from '../dom';
import { settingsStore, type SettingsStore } from '../settings';
import { bindModalKeys, GLYPHS } from './modalKeys';
import { arrowStep } from './radioNav';
import { SettingsAudioTab } from './SettingsAudioTab';
import { SettingsControlsTab } from './SettingsControlsTab';
import type { SettingsNotice } from './settingsView';
import '../hud.css';
import '../screens.css';
import '../pause.css';
import '../settings.css';

type TabId = 'audio' | 'controls';
const TAB_IDS: readonly TabId[] = ['audio', 'controls'];

const RESET_ICON = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/></svg>`;

/** The tab the card opened on last (per session), so a return to the settings lands where the player was. */
let lastTab: TabId = 'audio';

interface Tab {
  readonly button: HTMLButtonElement;
  readonly panel: HTMLElement;
}

/**
 * The settings card (from the main menu and the pause), in two tabs:
 * "Hang" (volumes, mute) and "Irányítás" (command gesture, scroll mode,
 * key bindings). Every change goes straight to `settingsStore` (which
 * persists it); the defaults button resets both tabs. While a key is
 * being captured Esc only cancels the capture; otherwise it goes back.
 */
export class SettingsScreen {
  private readonly root: HTMLElement;
  private readonly card: HTMLElement;
  private readonly status: HTMLElement;
  private readonly escLabel: HTMLElement;
  private readonly audioTab: SettingsAudioTab;
  private readonly controlsTab: SettingsControlsTab;
  private readonly tabs = new Map<TabId, Tab>();
  private readonly unbindKeys: () => void;
  private readonly unsubscribe: () => void;
  private active: TabId = lastTab;

  constructor(private readonly onBack: () => void) {
    audio().playSFX('ui_panel_open');
    const after = (change: () => void): void => this.after(change);
    this.audioTab = new SettingsAudioTab(after);
    this.controlsTab = new SettingsControlsTab({
      after,
      notice: (n) => this.notice(n),
      capturing: (on) => {
        this.escLabel.textContent = on ? hu.common.cancel : hu.common.back;
      },
    });
    const tablist = el('div', { class: 'set-tabs', role: 'tablist', 'aria-label': hu.settings.title });
    const panels = el('div', { class: 'set-body set-panels' });
    for (const id of TAB_IDS) {
      const panel = el('div', { class: 'set-tabpanel', role: 'tabpanel', id: `set-panel-${id}`, 'aria-labelledby': `set-tab-${id}` }, id === 'audio' ? this.audioTab.root : this.controlsTab.root);
      const button = el('button', { class: 'set-tab', type: 'button', role: 'tab', id: `set-tab-${id}`, 'aria-controls': `set-panel-${id}` }, hu.settings.tabs[id]);
      button.addEventListener('click', () => this.show(id));
      button.addEventListener('keydown', (e) => this.onTabKey(e, id));
      tablist.append(button);
      panels.append(panel);
      this.tabs.set(id, { button, panel });
    }
    tablist.append(el('i', { class: 'set-tab-thumb' }));
    this.status = el('div', { class: 'slots-status set-status', role: 'status', 'aria-live': 'polite' });
    const back = el(
      'button',
      { class: 'btn btn-ghost btn-back slots-back', type: 'button' },
      el('span', { class: 'arrow', html: GLYPHS.back }),
      el('span', {}, hu.common.back),
    );
    back.addEventListener('click', () => this.back());
    const reset = el('button', { class: 'btn btn-ghost set-reset', type: 'button' }, el('span', { class: 'arrow', html: RESET_ICON }), el('span', {}, hu.settings.reset));
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
      tablist,
      panels,
      this.status,
      el('div', { class: 'slots-foot set-foot' }, back, el('div', { class: 'pause-foot' }, el('kbd', {}, 'Esc'), this.escLabel), reset),
    );
    this.root = el('div', { class: 'screen pause-layer' }, this.card);
    uiRoot().append(this.root);
    this.unbindKeys = bindModalKeys(this.card, () => this.back());
    this.unsubscribe = settingsStore.subscribe((s) => this.sync(s));
    this.sync(settingsStore.getState());
    this.show(this.active, false);
    if (this.active === 'audio') this.audioTab.focusFirst();
    else this.tabs.get('controls')?.button.focus({ preventScroll: true });
  }

  /** Plays the exit animation (the owner removes the card shortly after). */
  leave(): void {
    this.controlsTab.stopCapture();
    this.root.classList.add('leaving');
    this.root.inert = true;
    this.unbindKeys();
  }

  destroy(): void {
    this.controlsTab.stopCapture();
    this.unbindKeys();
    this.unsubscribe();
    this.root.remove();
  }

  private show(id: TabId, sound = true): void {
    if (this.controlsTab.isCapturing) {
      this.controlsTab.stopCapture();
      this.notice(null);
    }
    if (sound && id !== this.active) audio().playSFX('ui_click');
    this.active = id;
    lastTab = id;
    this.card.style.setProperty('--tab', String(TAB_IDS.indexOf(id)));
    for (const [tid, { button, panel }] of this.tabs) {
      const on = tid === id;
      button.setAttribute('aria-selected', String(on));
      button.tabIndex = on ? 0 : -1;
      panel.classList.toggle('active', on);
      // The hidden panel is out of reach (display none, inert for bindModalKeys' Tab cycle).
      panel.inert = !on;
      panel.setAttribute('aria-hidden', String(!on));
    }
  }

  private onTabKey(e: KeyboardEvent, from: TabId): void {
    const dir = arrowStep(e.key);
    if (dir === 0) return;
    e.preventDefault();
    const next = TAB_IDS[(TAB_IDS.indexOf(from) + dir + TAB_IDS.length) % TAB_IDS.length] ?? from;
    this.show(next);
    this.tabs.get(next)?.button.focus();
  }

  /** Mirrors the store into both tabs (after any change, including a reset). */
  private sync(s: SettingsStore): void {
    this.audioTab.sync(s);
    this.controlsTab.sync(s);
  }

  /** Runs a store change; a change storage refused is still applied, and the card says it holds for this session only. */
  private after(change: () => void): void {
    change();
    if (!settingsStore.getState().persisted) this.notice({ text: hu.settings.notSaved, tone: 'error' });
  }

  private reset(): void {
    this.controlsTab.stopCapture();
    this.after(() => settingsStore.getState().resetDefaults());
    if (settingsStore.getState().persisted) this.notice({ text: hu.settings.resetDone, tone: 'ok' });
    this.controlsTab.flashAll();
  }

  private back(): void {
    if (this.controlsTab.isCapturing) {
      this.controlsTab.stopCapture();
      this.notice(null);
    }
    this.onBack();
  }

  private notice(n: SettingsNotice | null): void {
    this.status.replaceChildren();
    if (n) this.status.append(el('div', { class: `slots-notice set-notice ${n.tone}` }, n.text));
  }
}
