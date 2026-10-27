import { AVAILABLE_CIVS, CIV_IDS } from '../../config/civs';
import { hu } from '../../i18n/hu';
import type { CivId } from '../../types';
import type { CivPreview } from '../civPreview';
import { el } from '../dom';
import { arrowStep, nextEnabled } from './radioNav';

const CHECK = `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5 6.5 11.5 12.5 4.5"/></svg>`;

/**
 * The human's civ choice on the setup card: a card per playable civ
 * (its lit age-1 town centre with flickering windows, name and a
 * one-line description) and a compact "hamarosan" chip for each civ
 * still to come. A radiogroup: arrows move between playable civs.
 */
export class CivPicker {
  readonly root: HTMLElement;
  private readonly buttons: HTMLButtonElement[] = [];
  private readonly stages = new Map<CivId, HTMLElement>();
  private value: CivId;

  constructor(value: CivId, previews: (civ: CivId) => CivPreview | undefined, private readonly onChange: (civ: CivId) => void) {
    this.value = value;
    this.root = el('div', { class: 'civ-grid', role: 'radiogroup', 'aria-label': hu.setup.civ });
    CIV_IDS.forEach((id, i) => {
      const available = AVAILABLE_CIVS.includes(id);
      const button = available ? this.card(id, previews(id)) : this.soonChip(id);
      button.dataset['civ'] = id;
      if (available) {
        button.addEventListener('click', () => this.pick(id));
        button.addEventListener('keydown', (e) => this.onKey(e, i));
      }
      this.buttons.push(button);
      this.root.append(button);
    });
    this.set(value);
  }

  set(value: CivId): void {
    this.value = value;
    for (const b of this.buttons) {
      const on = b.dataset['civ'] === value;
      b.setAttribute('aria-checked', String(on));
      if (!b.disabled) b.tabIndex = on ? 0 : -1;
    }
  }

  /** Shows a preview painted after the card opened (fades in). */
  setPreview(civ: CivId, preview: CivPreview): void {
    const stage = this.stages.get(civ);
    if (!stage || !preview.art || stage.classList.contains('ready')) return;
    stage.prepend(...previewImages(preview));
    // Next frame, so the fade-in transition runs from the empty state.
    requestAnimationFrame(() => stage.classList.add('ready'));
  }

  private card(id: CivId, preview: CivPreview | undefined): HTMLButtonElement {
    const stage = el('span', { class: `civ-stage${preview?.art ? ' ready' : ''}`, 'aria-hidden': 'true' }, el('i', { class: 'civ-pool' }));
    if (preview?.art) stage.prepend(...previewImages(preview));
    this.stages.set(id, stage);
    return el(
      'button',
      { class: 'civ-card', type: 'button', role: 'radio' },
      stage,
      el(
        'span',
        { class: 'civ-text' },
        el('span', { class: 'civ-name' }, hu.civs[id]),
        el('span', { class: 'civ-desc' }, hu.setup.civDesc[id]),
      ),
      el('i', { class: 'civ-check', html: CHECK, 'aria-hidden': 'true' }),
    );
  }

  private soonChip(id: CivId): HTMLButtonElement {
    return el(
      'button',
      { class: 'civ-chip civ-soon', type: 'button', role: 'radio', disabled: true },
      el('span', { class: 'civ-name' }, hu.civs[id]),
      el('span', { class: 'soon' }, hu.setup.comingSoon),
    );
  }

  private pick(id: CivId): void {
    if (id !== this.value) this.onChange(id);
  }

  private onKey(e: KeyboardEvent, from: number): void {
    const dir = arrowStep(e.key);
    if (dir === 0) return;
    e.preventDefault();
    const j = nextEnabled(
      this.buttons.map((b) => !b.disabled),
      from,
      dir,
    );
    const target = this.buttons[j];
    const civ = target?.dataset['civ'] as CivId | undefined;
    if (!target || !civ) return;
    this.pick(civ);
    target.focus();
  }
}

function previewImages(preview: CivPreview): HTMLElement[] {
  return [el('img', { class: 'civ-art', src: preview.art, alt: '' }), el('img', { class: 'civ-glow', src: preview.glow, alt: '' })];
}
