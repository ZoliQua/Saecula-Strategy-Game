import { HILL } from '../../config/balance';
import { HILL_HUD } from '../../config/visual';
import type { HillClocksInfo, HillStatus } from '../../game/hillClocks';
import { hu } from '../../i18n/hu';
import { el, formatClock } from '../dom';
import { hex } from '../format';
import { icons } from '../icons';
import type { UiStore } from '../store';

export interface HillRowView {
  readonly team: number;
  readonly name: string;
  readonly time: string;
  /** Share of HILL.holdMs held, 0..1. */
  readonly done: number;
  readonly color: string;
  readonly own: boolean;
  readonly holder: boolean;
  readonly out: boolean;
  readonly warn: boolean;
}

export interface HillClockView {
  readonly status: HillStatus;
  readonly state: string;
  /** Why the clocks stand, or the warning; '' for neither. */
  readonly note: string;
  readonly waiting: boolean;
  readonly warn: boolean;
  readonly columns: 1 | 2;
  readonly rows: readonly HillRowView[];
}

/** What the hill panel shows. Seconds round up, so 0:00 is a win. */
export function hillClockView(info: HillClocksInfo): HillClockView {
  const t = hu.hill;
  const rows = info.rows.map((r): HillRowView => ({
    team: r.team,
    name: info.teams ? (r.own ? t.ownTeam : t.enemyTeam) : r.own ? t.you : hu.civs[r.civ],
    time: formatClock(Math.ceil(r.remainingMs / 1000) * 1000),
    done: 1 - r.remainingMs / HILL.holdMs,
    color: hex(r.color),
    own: r.own,
    holder: r.holder,
    out: r.out,
    warn: !r.own && !r.out && r.remainingMs <= HILL_HUD.warnMs,
  }));
  const warn = rows.some((r) => r.warn);
  const state =
    info.status === 'contested'
      ? t.contested
      : info.status === 'empty'
        ? t.empty
        : info.holder === 'own'
          ? info.teams
            ? t.heldTeam
            : t.heldYou
          : t.heldEnemy;
  return {
    status: info.status,
    state,
    note: info.waiting ? t.waiting : warn ? t.nearWin : '',
    waiting: info.waiting,
    warn,
    columns: rows.length > HILL_HUD.maxSingleColumn ? 2 : 1,
    rows,
  };
}

const STATE_ICON: Readonly<Record<HillStatus, string>> = { empty: icons.hillEmpty, held: icons.hillFlag, contested: icons.hillSwords };

interface Row {
  readonly node: HTMLElement;
  readonly name: HTMLElement;
  readonly time: HTMLElement;
  readonly fill: HTMLElement;
  shown?: HillRowView;
}

/**
 * The hill's panel in the right column (M19): its state in words and
 * shape, then every team's countdown, leading first, the holder flying a
 * flag. Dimmed while the treaty makes the clocks wait, red when an enemy
 * is close. Rows are kept per team, so only what changed is written.
 */
export class HillClock {
  readonly root: HTMLElement;
  private readonly icon: HTMLElement;
  private readonly state: HTMLElement;
  private readonly note: HTMLElement;
  private readonly list: HTMLElement;
  private readonly rows = new Map<number, Row>();
  private shown: UiStore['hill'] = null;
  private status: HillStatus | null = null;

  constructor() {
    this.icon = el('span', { class: 'hill-state-icon', 'aria-hidden': 'true' });
    this.state = el('span', { class: 'hill-state-text' });
    this.note = el('div', { class: 'hill-note' });
    this.list = el('div', { class: 'hill-rows' });
    this.root = el(
      'section',
      { class: 'glass hill-clock anim-in', 'aria-label': hu.hill.title, title: hu.hill.tip },
      el(
        'header',
        { class: 'hill-head' },
        el('span', { class: 'hill-emblem', html: icons.hill, 'aria-hidden': 'true' }),
        el('span', { class: 'hill-title' }, hu.hill.title),
        el('span', { class: 'hill-state', 'aria-live': 'polite' }, this.icon, this.state),
      ),
      this.note,
      this.list,
    );
  }

  render(state: UiStore): void {
    if (state.hill === this.shown) return;
    this.shown = state.hill;
    this.root.classList.toggle('show', state.hill !== null);
    if (!state.hill) return;
    const view = hillClockView(state.hill);
    if (view.status !== this.status) {
      this.status = view.status;
      this.root.dataset['status'] = view.status;
      this.icon.innerHTML = STATE_ICON[view.status];
    }
    setText(this.state, view.state);
    setText(this.note, view.note);
    this.root.style.setProperty('--holder', state.hill.color === null ? 'var(--ink-2)' : hex(state.hill.color));
    this.root.classList.toggle('waiting', view.waiting);
    this.root.classList.toggle('warn', view.warn && !view.waiting);
    this.list.classList.toggle('two', view.columns === 2);
    const live = new Set(view.rows.map((r) => r.team));
    for (const [team, row] of this.rows) {
      if (live.has(team)) continue;
      row.node.remove();
      this.rows.delete(team);
    }
    view.rows.forEach((r, i) => {
      const row = this.rows.get(r.team) ?? this.addRow(r.team);
      this.update(row, r);
      // Moved only when out of place (moving replays its entrance).
      if (this.list.children[i] !== row.node) this.list.insertBefore(row.node, this.list.children[i] ?? null);
    });
  }

  private addRow(team: number): Row {
    const name = el('span', { class: 'hill-name' });
    const time = el('span', { class: 'hill-time' });
    const fill = el('i');
    const node = el(
      'div',
      { class: 'hill-row' },
      el('span', { class: 'hill-mark', 'aria-hidden': 'true' }, el('i', { class: 'hill-dot' }), el('span', { class: 'hill-flag', html: icons.hillFlag })),
      name,
      time,
      el('span', { class: 'hill-bar' }, fill),
    );
    const row = { node, name, time, fill };
    this.rows.set(team, row);
    return row;
  }

  private update(row: Row, r: HillRowView): void {
    const was = row.shown;
    row.shown = r;
    if (was?.name !== r.name) row.name.textContent = r.name;
    if (was?.time !== r.time) row.time.textContent = r.time;
    if (was?.done !== r.done) row.fill.style.transform = `scaleX(${r.done})`;
    if (was?.color !== r.color) row.node.style.setProperty('--pc', r.color);
    for (const flag of ['own', 'holder', 'out', 'warn'] as const) {
      if (was?.[flag] !== r[flag]) row.node.classList.toggle(flag, r[flag]);
    }
  }

  destroy(): void {
    this.root.remove();
    this.rows.clear();
  }
}

function setText(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}
