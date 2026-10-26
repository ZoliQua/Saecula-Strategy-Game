import { hu } from '../../i18n/hu';
import { el } from '../dom';

export interface SegmentItem<T extends string> {
  value: T;
  label: string;
  sub?: string;
  disabled?: boolean;
}

/**
 * Single-choice segmented control (radiogroup) with a sliding amber
 * thumb. Arrow keys move between enabled options; disabled ones show a
 * "hamarosan" tag.
 */
export class Segmented<T extends string> {
  readonly root: HTMLElement;
  private readonly buttons: HTMLButtonElement[] = [];
  private value: T;

  constructor(
    name: string,
    label: string,
    private readonly items: readonly SegmentItem<T>[],
    value: T,
    private readonly onChange: (value: T) => void,
  ) {
    this.value = value;
    this.root = el('div', {
      class: `seg seg-${name}`,
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
      this.buttons.push(b);
      this.root.append(b);
    });
    this.set(value);
  }

  set(value: T): void {
    this.value = value;
    const idx = Math.max(0, this.items.findIndex((it) => it.value === value));
    this.root.style.setProperty('--i', String(idx));
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
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (dir === 0) return;
    e.preventDefault();
    for (let step = 1; step <= this.items.length; step++) {
      const j = (from + dir * step + this.items.length * step) % this.items.length;
      const item = this.items[j];
      if (item && !item.disabled) {
        this.pick(item.value);
        this.buttons[j]?.focus();
        return;
      }
    }
  }
}
