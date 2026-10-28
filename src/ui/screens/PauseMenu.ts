import { hu } from '../../i18n/hu';
import { el, uiRoot } from '../dom';
import { bindModalKeys, GLYPHS } from './modalKeys';
import '../hud.css';
import '../screens.css';
import '../pause.css';

export interface PauseMenuHandlers {
  onResume(): void;
  onSave(): void;
  onLoad(): void;
  onSettings(): void;
  onQuit(): void;
}

/** The dimmed, blurred layer behind the pause cards (owned by PauseScene, so it does not flash between cards). */
export function createPauseBackdrop(): HTMLElement {
  const backdrop = el('div', { class: 'screen pause-backdrop', 'aria-hidden': 'true' });
  uiRoot().append(backdrop);
  return backdrop;
}

/**
 * The pause card (Esc): resume, save, load, settings and quit. Quitting
 * asks for an inline confirmation inside the card. Esc resumes, or,
 * while the confirmation shows, cancels it.
 */
export class PauseMenu {
  private readonly root: HTMLElement;
  private readonly card: HTMLElement;
  private readonly actions: HTMLElement;
  private readonly confirm: HTMLElement;
  private readonly settingsBtn: HTMLButtonElement;
  private readonly quitBtn: HTMLButtonElement;
  /** What Esc does now, next to the key in the foot. */
  private readonly escLabel: HTMLElement;
  private readonly unbindKeys: () => void;
  private confirming = false;
  /** Buttons made so far (their stagger index). */
  private actionsCount = 0;

  constructor(handlers: PauseMenuHandlers) {
    // Made in their on-screen order: the index sets each button's entrance stagger.
    const resume = this.action(GLYPHS.play, hu.pause.resume, 'btn-primary', () => handlers.onResume());
    const save = this.action(GLYPHS.save, hu.pause.save, 'btn-ghost', () => handlers.onSave());
    const load = this.action(GLYPHS.load, hu.pause.load, 'btn-ghost', () => handlers.onLoad());
    this.settingsBtn = this.action(GLYPHS.gear, hu.pause.settings, 'btn-ghost', () => handlers.onSettings());
    this.quitBtn = this.action(GLYPHS.door, hu.pause.quit, 'btn-ghost pause-quit', () => this.askQuit(true));
    this.actions = el(
      'div',
      { class: 'pause-actions' },
      resume,
      save,
      load,
      this.settingsBtn,
      el('div', { class: 'pause-rule', 'aria-hidden': 'true' }),
      this.quitBtn,
    );
    this.escLabel = el('span', {}, hu.pause.resume);
    const yes = el('button', { class: 'btn btn-danger', type: 'button' }, hu.common.yes);
    yes.addEventListener('click', () => handlers.onQuit());
    const no = el('button', { class: 'btn btn-ghost', type: 'button' }, hu.common.cancel);
    no.addEventListener('click', () => this.askQuit(false));
    this.confirm = el(
      'div',
      { class: 'pause-confirm', role: 'alertdialog', 'aria-live': 'polite', hidden: true },
      el('span', { class: 'pause-confirm-icon', html: GLYPHS.warn }),
      el('p', { class: 'pause-confirm-text' }, hu.pause.quitConfirm),
      el('div', { class: 'pause-confirm-actions' }, no, yes),
    );
    this.card = el(
      'div',
      { class: 'glass pause-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': hu.pause.title },
      el(
        'div',
        { class: 'pause-head' },
        el('div', { class: 'eyebrow pause-kicker' }, hu.pause.kicker),
        el('h2', { class: 'pause-title' }, hu.pause.title),
        el('div', { class: 'pause-ornament', 'aria-hidden': 'true' }, el('span', {}), el('i', {}), el('span', {})),
      ),
      this.actions,
      this.confirm,
      el('div', { class: 'pause-foot' }, el('kbd', {}, 'Esc'), this.escLabel),
    );
    this.root = el('div', { class: 'screen pause-layer' }, this.card);
    uiRoot().append(this.root);
    this.unbindKeys = bindModalKeys(this.card, () => (this.confirming ? this.askQuit(false) : handlers.onResume()));
    this.setSettingsEnabled(false);
    resume.focus({ preventScroll: true });
  }

  /** Whether the settings button works (off: greyed with a "Hamarosan" tag); PauseScene turns it on. */
  setSettingsEnabled(on: boolean): void {
    this.settingsBtn.disabled = !on;
    this.settingsBtn.querySelector('.soon')?.remove();
    if (!on) this.settingsBtn.append(el('span', { class: 'soon' }, hu.menu.comingSoon));
  }

  /** Plays the exit animation (the scene removes the card shortly after). */
  leave(): void {
    this.root.classList.add('leaving');
    this.root.inert = true;
    this.unbindKeys();
  }

  destroy(): void {
    this.unbindKeys();
    this.root.remove();
  }

  private action(glyph: string, label: string, kind: string, onClick: () => void): HTMLButtonElement {
    const i = this.actionsCount++;
    const btn = el(
      'button',
      { class: `btn ${kind} pause-btn`, type: 'button', style: `--i:${i}` },
      el('span', { class: 'pause-btn-icon', html: glyph }),
      el('span', { class: 'pause-btn-label' }, label),
    );
    btn.addEventListener('click', onClick);
    return btn;
  }

  /** Shows or hides the inline quit confirmation; the focus moves with it. */
  private askQuit(open: boolean): void {
    this.confirming = open;
    this.confirm.hidden = !open;
    this.actions.classList.toggle('dimmed', open);
    this.actions.inert = open;
    this.escLabel.textContent = open ? hu.common.cancel : hu.pause.resume;
    if (open) this.confirm.querySelector<HTMLButtonElement>('.btn-ghost')?.focus({ preventScroll: true });
    else this.quitBtn.focus({ preventScroll: true });
  }
}
