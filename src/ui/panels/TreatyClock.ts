import { hu } from '../../i18n/hu';
import { el, formatClock } from '../dom';
import type { UiStore } from '../store';

/** True on the update the treaty runs out (the HUD announces it once); a reset (null) or a load past it is no end. */
export function treatyEnded(prev: number | null, next: number | null): boolean {
  return prev !== null && prev > 0 && next === 0;
}

/** The countdown text, or null when nothing is shown (no treaty, or over). */
export function treatyLabel(leftMs: number | null): string | null {
  return leftMs !== null && leftMs > 0 ? hu.treaty.clock(formatClock(leftMs)) : null;
}

/**
 * The treaty countdown (M16) under the clock, in the time-limit clock's
 * glass style (both can show together). Hidden with no treaty and once it
 * is over; `onEnded` fires once when it runs out.
 */
export class TreatyClock {
  readonly root: HTMLElement;
  private readonly text: HTMLElement;
  private shown: number | null = null;

  constructor(private readonly onEnded: () => void) {
    this.text = el('span', { class: 'time-limit-time' });
    this.root = el('div', { class: 'glass time-limit treaty-clock anim-in', 'aria-live': 'polite' }, this.text);
  }

  render(state: UiStore): void {
    const left = state.treatyLeftMs;
    if (left === this.shown) return;
    if (treatyEnded(this.shown, left)) this.onEnded();
    this.shown = left;
    const label = treatyLabel(left);
    this.root.classList.toggle('show', label !== null);
    if (label !== null) this.text.textContent = label;
  }

  destroy(): void {
    this.root.remove();
  }
}
