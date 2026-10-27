import { AVAILABLE_CIVS, CIV_DEFS, CIV_IDS } from '../../config/civs';
import { hu } from '../../i18n/hu';
import type { CivId } from '../../types';
import type { CivPreview } from '../civPreview';
import { el } from '../dom';
import { arrowStep, nextEnabled } from './radioNav';

const CHECK = `<svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5 6.5 11.5 12.5 4.5"/></svg>`;

/** CSS colour of a 0xRRGGBB heraldry tint. */
export const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/**
 * The human's civ choice on the setup card: a 4×2 grid with a card per
 * civ — the playable ones show their lit age-1 town centre with
 * flickering windows, the rest a "hamarosan" chip. Each card carries its
 * civ's heraldic colours; the chosen civ's one-line description shows in
 * `caption` (the card's accessible description is its own line). A
 * radiogroup: arrows move between playable civs.
 */
export class CivPicker {
  readonly root: HTMLElement;
  /** The chosen civ's name and description, for the field's label column. */
  readonly caption: HTMLElement;
  private readonly captionName: HTMLElement;
  private readonly captionDesc: HTMLElement;
  private readonly buttons: HTMLButtonElement[] = [];
  private readonly stages = new Map<CivId, HTMLElement>();
  private value: CivId;

  constructor(value: CivId, previews: (civ: CivId) => CivPreview | undefined, private readonly onChange: (civ: CivId) => void) {
    this.value = value;
    this.root = el('div', { class: 'civ-grid', role: 'radiogroup', 'aria-label': hu.setup.civ });
    CIV_IDS.forEach((id, i) => {
      const available = AVAILABLE_CIVS.includes(id);
      const button = this.card(id, available ? previews(id) : undefined, available);
      button.dataset['civ'] = id;
      if (available) {
        button.addEventListener('click', () => this.pick(id));
        button.addEventListener('keydown', (e) => this.onKey(e, i));
      }
      this.buttons.push(button);
      this.root.append(button);
    });
    this.captionName = el('span', { class: 'civ-caption-name' });
    this.captionDesc = el('span', { class: 'civ-caption-desc' });
    // Visual only: each card already describes itself to assistive tech.
    this.caption = el('div', { class: 'civ-caption', 'aria-hidden': 'true' }, this.captionName, this.captionDesc);
    this.set(value);
  }

  set(value: CivId): void {
    const changed = value !== this.value;
    this.value = value;
    for (const b of this.buttons) {
      const on = b.dataset['civ'] === value;
      b.setAttribute('aria-checked', String(on));
      if (!b.disabled) b.tabIndex = on ? 0 : -1;
    }
    this.captionName.textContent = hu.civs[value];
    this.captionDesc.textContent = hu.setup.civDesc[value];
    if (changed) {
      // Replays the caption's swap-in animation.
      this.caption.classList.remove('swap');
      void this.caption.offsetWidth;
      this.caption.classList.add('swap');
    }
  }

  /** Shows a preview painted after the card opened (fades in); a failed paint shows a static placeholder instead of the shimmer. */
  setPreview(civ: CivId, preview: CivPreview): void {
    const stage = this.stages.get(civ);
    if (!stage || stage.classList.contains('ready')) return;
    if (preview.art) stage.prepend(...previewImages(preview));
    else stage.classList.add('failed');
    // Next frame, so the fade-in transition runs from the empty state.
    requestAnimationFrame(() => stage.classList.add('ready'));
  }

  private card(id: CivId, preview: CivPreview | undefined, available: boolean): HTMLButtonElement {
    const { primary, secondary, accent } = CIV_DEFS[id].heraldry;
    const stage = el(
      'span',
      { class: `civ-stage${preview ? ' ready' : ''}${preview && !preview.art ? ' failed' : ''}`, 'aria-hidden': 'true' },
      el('i', { class: 'civ-pool' }),
      el('i', { class: 'civ-flag', style: `--h1:${hex(primary)};--h2:${hex(secondary)};--h3:${hex(accent)}` }),
      available ? null : el('span', { class: 'soon' }, hu.setup.comingSoon),
    );
    if (preview?.art) stage.prepend(...previewImages(preview));
    if (available) this.stages.set(id, stage);
    // Named by the civ only; the one-liner is its description (not read as one run-on name).
    const nameId = `civ-name-${id}`;
    const descId = `civ-desc-${id}`;
    return el(
      'button',
      {
        class: `civ-card${available ? '' : ' civ-soon'}`,
        type: 'button',
        role: 'radio',
        disabled: !available,
        'aria-labelledby': nameId,
        'aria-describedby': descId,
      },
      stage,
      el('span', { class: 'civ-name', id: nameId }, hu.civs[id]),
      el('span', { class: 'sr-only', id: descId }, available ? hu.setup.civDesc[id] : `${hu.setup.civDesc[id]} (${hu.setup.comingSoon})`),
      el('i', { class: 'civ-check', html: CHECK, 'aria-hidden': 'true' }),
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
