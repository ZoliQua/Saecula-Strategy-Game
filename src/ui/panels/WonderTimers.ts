import type { WonderClockInfo } from '../../game/wonderClocks';
import { hu } from '../../i18n/hu';
import { el, formatClock } from '../dom';
import { hex } from '../screens/CivPicker';
import type { UiStore } from '../store';

interface Row {
  readonly node: HTMLElement;
  readonly text: HTMLElement;
}

/**
 * Wonder countdowns under the HUD clock: one glass pill per standing
 * Wonder (owner's colour swatch + time left), soonest first. Hidden
 * while no Wonder clock runs. Rows are kept per Wonder so only the
 * text changes each second (the entrance plays once per Wonder).
 */
export class WonderTimers {
  readonly root: HTMLElement;
  private readonly rows = new Map<number, Row>();
  private shown: readonly WonderClockInfo[] = [];

  constructor() {
    this.root = el('div', { class: 'wonder-timers', 'aria-live': 'polite' });
  }

  render(state: UiStore): void {
    if (state.wonders === this.shown) return;
    this.shown = state.wonders;
    const live = new Set(state.wonders.map((w) => w.entityId));
    for (const [id, row] of this.rows) {
      if (live.has(id)) continue;
      row.node.remove();
      this.rows.delete(id);
    }
    state.wonders.forEach((w, i) => {
      const row = this.rows.get(w.entityId) ?? this.addRow(w);
      row.text.textContent = hu.hud.wonderClock(formatClock(w.remainingMs));
      row.node.classList.toggle('own', w.playerId === 1);
      // Soonest first; a row is only moved when out of place (moving it would replay its entrance).
      if (this.root.children[i] !== row.node) this.root.insertBefore(row.node, this.root.children[i] ?? null);
    });
    this.root.classList.toggle('show', state.wonders.length > 0);
  }

  private addRow(w: WonderClockInfo): Row {
    const text = el('span', { class: 'wonder-time' });
    const node = el(
      'div',
      { class: 'glass wonder-timer anim-in' },
      el('span', { class: 'wonder-swatch', style: `background:${hex(w.color)}` }),
      text,
    );
    const row = { node, text };
    this.rows.set(w.entityId, row);
    return row;
  }

  destroy(): void {
    this.root.remove();
    this.rows.clear();
  }
}
