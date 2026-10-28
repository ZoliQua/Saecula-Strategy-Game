import { hu } from '../../i18n/hu';
import type { SlotId } from '../../save/storage';
import { el, uiRoot } from '../dom';
import { icons } from '../icons';
import { bindModalKeys, GLYPHS } from './modalKeys';
import { needsConfirm, type SlotRow } from './slotRows';
import '../hud.css';
import '../screens.css';
import '../pause.css';

export interface SaveSlotsHandlers {
  /** A slot was picked (after the overwrite confirmation in save mode). The list waits while a returned promise runs. */
  onPick(slot: SlotId): void | Promise<void>;
  onBack(): void;
}

/** Placeholder rows while the slots are being read (save mode has 5 slots, load mode 6). */
const SKELETON_ROWS = { save: 5, load: 6 } as const;

/**
 * The save / load slot list. Rows come from slotRows; an empty list shows
 * placeholders until setRows. In save mode a filled slot asks for an
 * inline overwrite confirmation first. Esc goes back, or cancels the
 * confirmation while it shows.
 */
export class SaveSlots {
  private readonly root: HTMLElement;
  private readonly card: HTMLElement;
  private readonly list: HTMLElement;
  private readonly status: HTMLElement;
  private readonly unbindKeys: () => void;
  private rows: readonly SlotRow[] = [];
  /** The filled slot waiting for the overwrite confirmation. */
  private pending: SlotId | null = null;
  private busy = false;
  /** Rows play their entrance only on the first fill. */
  private filled = false;
  /** The slot last picked, so the focus returns to it after a save. */
  private lastSlot: SlotId | null = null;

  constructor(
    private readonly mode: 'save' | 'load',
    rows: readonly SlotRow[],
    private readonly handlers: SaveSlotsHandlers,
    /** `confirmLoad`: a load asks first (from the pause, where it replaces the running match). */
    private readonly options: { confirmLoad?: boolean } = {},
  ) {
    this.list = el('div', { class: 'slots-list' });
    this.status = el('div', { class: 'slots-status', role: 'status', 'aria-live': 'polite' });
    const back = el(
      'button',
      { class: 'btn btn-ghost btn-back slots-back', type: 'button' },
      el('span', { class: 'arrow', html: GLYPHS.back }),
      el('span', {}, hu.common.back),
    );
    back.addEventListener('click', () => this.back());
    const title = mode === 'save' ? hu.save.title : hu.save.loadTitle;
    this.card = el(
      'div',
      { class: `glass slots-card ${mode}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      el(
        'div',
        { class: 'pause-head' },
        el('div', { class: 'eyebrow pause-kicker' }, hu.save.kicker),
        el('h2', { class: 'pause-title' }, title),
        el('div', { class: 'pause-ornament', 'aria-hidden': 'true' }, el('span', {}), el('i', {}), el('span', {})),
      ),
      this.list,
      this.status,
      el('div', { class: 'slots-foot' }, back, el('span', { class: 'pause-foot' }, el('kbd', {}, 'Esc'), el('span', {}, hu.common.back))),
    );
    this.root = el('div', { class: 'screen pause-layer slots-layer' }, this.card);
    uiRoot().append(this.root);
    this.unbindKeys = bindModalKeys(this.card, () => (this.pending !== null ? this.cancelConfirm() : this.back()));
    this.setRows(rows);
    back.focus({ preventScroll: true });
  }

  /** Replaces the rows (after the slots were read, or after a save). */
  setRows(rows: readonly SlotRow[]): void {
    this.rows = rows;
    this.pending = null;
    this.render();
  }

  /** A line under the list: a stored save (amber) or why something failed (red). */
  notice(message: string, tone: 'ok' | 'error'): void {
    this.status.replaceChildren(el('span', { class: `slots-notice ${tone}` }, message));
  }

  /** Plays the exit animation (the owner removes the card shortly after). */
  leave(): void {
    this.root.classList.add('leaving');
    this.root.inert = true;
    // A leaving card no longer answers Esc (a new card may already be open).
    this.unbindKeys();
  }

  destroy(): void {
    this.unbindKeys();
    this.root.remove();
  }

  private back(): void {
    if (!this.busy) this.handlers.onBack();
  }

  private render(): void {
    const focusedSlot = (document.activeElement as HTMLElement | null)?.dataset?.slot ?? (this.lastSlot === null ? undefined : String(this.lastSlot));
    if (this.rows.length === 0) {
      const n = SKELETON_ROWS[this.mode];
      this.list.replaceChildren(...Array.from({ length: n }, (_, i) => el('div', { class: 'slot-row skeleton', style: `--i:${i}`, 'aria-hidden': 'true' }, el('span', { class: 'slot-badge' }), el('span', { class: 'slot-text' }, el('i', {}), el('i', {})))));
      this.list.setAttribute('aria-busy', 'true');
      return;
    }
    this.list.removeAttribute('aria-busy');
    this.list.classList.toggle('entering', !this.filled);
    this.filled = true;
    this.list.replaceChildren(...this.rows.map((row, i) => (row.slot === this.pending ? this.confirmRow(row, i) : this.slotRow(row, i))));
    const refocus = this.list.querySelector<HTMLElement>(this.pending !== null ? '.slot-confirm .btn-ghost' : `[data-slot="${focusedSlot ?? ''}"]`);
    refocus?.focus({ preventScroll: true });
  }

  private badge(row: SlotRow): HTMLElement {
    return el('span', { class: 'slot-badge', html: row.slot === 'auto' ? GLYPHS.auto : undefined }, row.slot === 'auto' ? null : String(row.slot));
  }

  private slotRow(row: SlotRow, i: number): HTMLElement {
    const badge = this.badge(row);
    const text = el('span', { class: 'slot-text' }, el('span', { class: 'slot-title' }, row.title), ...slotDetail(row));
    const btn = el(
      'button',
      { class: `slot-row ${row.status}`, type: 'button', style: `--i:${i}`, disabled: row.disabled || this.busy, 'data-slot': String(row.slot) },
      badge,
      text,
      el('span', { class: 'slot-go', html: this.mode === 'save' ? GLYPHS.save : GLYPHS.arrow }),
    );
    btn.addEventListener('click', () => this.pick(row));
    return btn;
  }

  private confirmRow(row: SlotRow, i: number): HTMLElement {
    const yes = el('button', { class: 'btn btn-primary', type: 'button' }, hu.common.yes);
    yes.addEventListener('click', () => this.run(row.slot));
    const question = this.mode === 'save' ? hu.save.overwrite : hu.save.loadConfirm;
    const no = el('button', { class: 'btn btn-ghost', type: 'button' }, hu.common.cancel);
    no.addEventListener('click', () => this.cancelConfirm());
    return el(
      'div',
      { class: 'slot-row slot-confirm', role: 'group', style: `--i:${i}`, 'data-slot': String(row.slot) },
      this.badge(row),
      el('span', { class: 'slot-text' }, el('span', { class: 'slot-title' }, question), ...slotDetail(row)),
      el('span', { class: 'slot-confirm-actions' }, no, yes),
    );
  }

  private pick(row: SlotRow): void {
    if (this.busy || row.disabled) return;
    if (needsConfirm(this.mode, row, this.options.confirmLoad === true)) {
      this.pending = row.slot;
      this.render();
      return;
    }
    this.run(row.slot);
  }

  private cancelConfirm(): void {
    const slot = this.pending;
    this.pending = null;
    this.render();
    this.list.querySelector<HTMLElement>(`[data-slot="${slot ?? ''}"]`)?.focus({ preventScroll: true });
  }

  private run(slot: SlotId): void {
    this.pending = null;
    this.lastSlot = slot;
    const done = this.handlers.onPick(slot);
    if (!done) return this.render();
    this.busy = true;
    this.card.classList.add('busy');
    this.render();
    void done.finally(() => {
      this.busy = false;
      this.card.classList.remove('busy');
      this.render();
    });
  }
}

/** Parts of a save's detail (slotRows): civ · age · template · size, then the game time and the saved date. */
const SAVE_PARTS = 6;

/**
 * The detail lines of a row: a save shows its match (civ, age, map) on one
 * line and when (game time, saved date) on a quieter second line; other
 * rows show their text, an error with a warning glyph.
 */
function slotDetail(row: SlotRow): HTMLElement[] {
  const parts = row.detail.split(' · ');
  if (row.status !== 'ok' || parts.length !== SAVE_PARTS) {
    const line = el('span', { class: 'slot-detail' }, row.detail);
    if (row.status === 'error') line.prepend(el('span', { class: 'slot-warn', html: GLYPHS.warn }));
    return [line];
  }
  const match = el('span', { class: 'slot-detail' });
  parts.slice(0, 4).forEach((part, k) => {
    if (k > 0) match.append(el('span', { class: 'sep', 'aria-hidden': 'true' }, '·'));
    match.append(el('span', {}, part));
  });
  const when = el(
    'span',
    { class: 'slot-when' },
    el('span', { class: 'slot-clock', html: icons.clock }),
    el('b', {}, parts[4] ?? ''),
    el('span', { class: 'sep', 'aria-hidden': 'true' }, '·'),
    el('span', {}, parts[5] ?? ''),
  );
  return [match, when];
}
