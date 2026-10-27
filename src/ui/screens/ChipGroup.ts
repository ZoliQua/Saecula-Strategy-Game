import { el } from '../dom';
import { arrowStep, nextEnabled } from './radioNav';

export interface ChipItem<T extends string> {
  value: T;
  label: string;
  /** Background of the chip's colour swatch (any CSS background). */
  swatch: string;
  /** Read after the label (e.g. "véletlen"). */
  description?: string;
}

/**
 * Single-choice group of compact chips (radiogroup) that wraps onto as
 * many rows as it needs — for lists too long for a segmented control
 * (the AIs' civ: "Vegyes" plus every playable civ). Arrow keys move
 * between chips and wrap.
 */
export class ChipGroup<T extends string> {
  readonly root: HTMLElement;
  private readonly buttons: HTMLButtonElement[] = [];
  private value: T;

  constructor(
    name: string,
    label: string,
    private readonly items: readonly ChipItem<T>[],
    value: T,
    private readonly onChange: (value: T) => void,
  ) {
    this.value = value;
    this.root = el('div', { class: `chip-group chips-${name}`, role: 'radiogroup', 'aria-label': label });
    items.forEach((item, i) => {
      const b = el(
        'button',
        { class: 'pick-chip', type: 'button', role: 'radio', 'aria-checked': false, 'aria-description': item.description },
        el('i', { class: 'pick-swatch', style: `background:${item.swatch}`, 'aria-hidden': 'true' }),
        el('span', { class: 'pick-label' }, item.label),
      );
      b.addEventListener('click', () => this.pick(item.value));
      b.addEventListener('keydown', (e) => this.onKey(e, i));
      this.buttons.push(b);
      this.root.append(b);
    });
    this.set(value);
  }

  set(value: T): void {
    this.value = value;
    const idx = Math.max(0, this.items.findIndex((it) => it.value === value));
    this.buttons.forEach((b, i) => {
      b.setAttribute('aria-checked', String(i === idx));
      b.tabIndex = i === idx ? 0 : -1;
    });
  }

  private pick(value: T): void {
    if (value !== this.value) this.onChange(value);
  }

  private onKey(e: KeyboardEvent, from: number): void {
    const dir = arrowStep(e.key);
    if (dir === 0) return;
    e.preventDefault();
    const j = nextEnabled(
      this.items.map(() => true),
      from,
      dir,
    );
    const item = this.items[j];
    if (!item) return;
    this.pick(item.value);
    this.buttons[j]?.focus();
  }
}
