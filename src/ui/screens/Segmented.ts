import { hu } from '../../i18n/hu';
import { el } from '../dom';
import { arrowStep, nextEnabled } from './radioNav';
import { segPlace, type SegPlace } from './segLayout';

export interface SegmentItem<T extends string> {
  value: T;
  label: string;
  sub?: string;
  disabled?: boolean;
}

/**
 * Single-choice segmented control (radiogroup) with a sliding amber
 * thumb. Arrow keys move between enabled options; options disabled from
 * the start show a "hamarosan" tag, one switched off later (setEnabled)
 * none: its owner says why. With `perRow` the options wrap into rows.
 */
export class Segmented<T extends string> {
  readonly root: HTMLElement;
  private readonly buttons: HTMLButtonElement[] = [];
  private value: T;
  private readonly enabled: boolean[];
  private readonly places: readonly SegPlace[] | null;

  constructor(
    name: string,
    label: string,
    private readonly items: readonly SegmentItem<T>[],
    value: T,
    private readonly onChange: (value: T) => void,
    perRow: number = items.length,
  ) {
    this.value = value;
    this.enabled = items.map((it) => !it.disabled);
    this.places = items.length > perRow ? items.map((_, i) => segPlace(i, items.length, perRow)) : null;
    this.root = el('div', {
      class: `seg seg-${name}${this.places ? ' wrap' : ''}`,
      role: 'radiogroup',
      'aria-label': label,
      style: `--n:${items.length}`,
    });
    this.root.append(el('i', { class: 'seg-thumb' }));
    items.forEach((item, i) => {
      const b = el(
        'button',
        { class: 'seg-item', type: 'button', role: 'radio', disabled: item.disabled === true, 'aria-checked': false },
        el('span', { class: 'seg-label' }, item.label),
        item.disabled
          ? el('span', { class: 'seg-sub soon' }, hu.setup.comingSoon)
          : item.sub
            ? el('span', { class: 'seg-sub' }, item.sub)
            : null,
      );
      b.addEventListener('click', () => this.pick(item.value));
      b.addEventListener('keydown', (e) => this.onKey(e, i));
      const place = this.places?.[i];
      if (place) b.style.gridColumn = `span ${place.span}`;
      this.buttons.push(b);
      this.root.append(b);
    });
    const first = this.places?.[0];
    if (first) {
      this.root.style.setProperty('--cells', String(first.cells));
      this.root.style.setProperty('--rows', String(first.rows));
    }
    this.set(value);
  }

  /**
   * Switches one option on or off; the arrow keys skip it while off.
   * `reasonId` is the element saying why, its description while off.
   */
  setEnabled(value: T, on: boolean, reasonId?: string): void {
    this.items.forEach((item, i) => {
      if (item.value !== value) return;
      this.enabled[i] = on;
      const b = this.buttons[i];
      if (!b) return;
      b.disabled = !on;
      if (!on && reasonId) b.setAttribute('aria-describedby', reasonId);
      else b.removeAttribute('aria-describedby');
    });
  }

  set(value: T): void {
    this.value = value;
    const idx = Math.max(0, this.items.findIndex((it) => it.value === value));
    const place = this.places?.[idx];
    this.root.style.setProperty('--i', String(place?.col ?? idx));
    if (place) {
      // The thumb takes its row's column width and drops to that row.
      this.root.style.setProperty('--n', String(place.inRow));
      this.root.style.setProperty('--r', String(place.row));
    }
    this.buttons.forEach((b, i) => {
      const on = i === idx;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    });
  }

  private pick(value: T): void {
    if (value === this.value) return;
    this.onChange(value);
  }

  private onKey(e: KeyboardEvent, from: number): void {
    const dir = arrowStep(e.key);
    if (dir === 0) return;
    e.preventDefault();
    const j = nextEnabled(this.enabled, from, dir);
    const item = this.items[j];
    if (!item) return;
    this.pick(item.value);
    this.buttons[j]?.focus();
  }
}
