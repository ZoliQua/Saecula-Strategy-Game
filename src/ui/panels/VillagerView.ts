import { hu } from '../../i18n/hu';
import { VILLAGER_ACTIVITIES, type VillagerActivity } from '../../stats/villagerActivity';
import { el } from '../dom';
import { dispatchCommand } from '../events';
import { icons } from '../icons';

const ICON: Record<VillagerActivity, string> = {
  food: icons.food,
  wood: icons.wood,
  gold: icons.gold,
  build: icons.hammer,
  idle: icons.idle,
  other: icons.walk,
};

interface Row {
  readonly node: HTMLButtonElement;
  readonly count: HTMLElement;
  readonly share: HTMLElement;
  value: number;
}

/**
 * The side panel's "Falusiak" view: a row per activity (Étel, Fa,
 * Arany, Építés, Tétlen, Egyéb) with its villager count and a share
 * bar. A click selects exactly those villagers (the game side resolves
 * them at click time). The Tétlen row glows while anyone is idle.
 */
export class VillagerView {
  readonly root: HTMLElement;
  private readonly rows = new Map<VillagerActivity, Row>();
  private readonly total: HTMLElement;
  private shown: Readonly<Record<VillagerActivity, number>> | null = null;

  constructor() {
    const list = el('div', { class: 'vl-list' });
    for (const a of VILLAGER_ACTIVITIES) {
      const count = el('span', { class: 'vl-count' }, '0');
      const share = el('span', { class: 'vl-share' });
      const node = el(
        'button',
        { class: `vl-row vl-${a}`, type: 'button' },
        share,
        el('span', { class: 'vl-icon', html: ICON[a] }),
        el('span', { class: 'vl-label' }, hu.side.activity[a]),
        count,
      );
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        if ((this.shown?.[a] ?? 0) > 0) dispatchCommand({ type: 'select-villagers', activity: a });
      });
      list.append(node);
      this.rows.set(a, { node, count, share, value: -1 });
    }
    this.total = el('div', { class: 'vl-total' });
    this.root = el('div', { class: 'vl-view' }, list, this.total);
  }

  render(counts: Readonly<Record<VillagerActivity, number>>): void {
    if (counts === this.shown) return;
    const first = this.shown === null;
    this.shown = counts;
    const total = VILLAGER_ACTIVITIES.reduce((n, a) => n + counts[a], 0);
    for (const a of VILLAGER_ACTIVITIES) {
      const row = this.rows.get(a)!;
      const n = counts[a];
      row.share.style.width = `${total > 0 ? (n / total) * 100 : 0}%`;
      if (n === row.value) continue;
      if (!first && row.value >= 0) {
        row.count.classList.remove('bump');
        void row.count.offsetWidth;
        row.count.classList.add('bump');
      }
      row.value = n;
      row.count.textContent = String(n);
      row.node.classList.toggle('empty', n === 0);
      row.node.disabled = n === 0;
      row.node.title = n > 0 ? hu.side.selectRow(n, hu.side.activity[a]) : '';
      if (a === 'idle') row.node.classList.toggle('alert', n > 0);
    }
    this.total.textContent = hu.side.total(total);
  }
}
