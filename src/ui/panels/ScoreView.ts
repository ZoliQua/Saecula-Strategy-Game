import { hu } from '../../i18n/hu';
import { el } from '../dom';
import { grouped, hex } from '../format';
import type { ScoreRowInfo } from '../store';

const COUNT_MS = 600;
const MOVE_MS = 420;

interface Row {
  readonly node: HTMLElement;
  readonly rank: HTMLElement;
  readonly value: HTMLElement;
  readonly fill: HTMLElement;
  shown: number;
  from: number;
  target: number;
  start: number;
}


/**
 * The side panel's "Pontszám" view: one row per player, highest score
 * first, with the player's colour crest, civ name ("Te" on the human's),
 * the score counting up to its new value and a bar relative to the
 * leader. A rank change slides the rows to their new places (FLIP);
 * defeated players are struck through.
 */
export class ScoreView {
  readonly root: HTMLElement;
  private readonly rows = new Map<number, Row>();
  private shown: readonly ScoreRowInfo[] | null = null;
  private raf = 0;

  constructor() {
    this.root = el('div', { class: 'sc-list' });
  }

  render(scores: readonly ScoreRowInfo[]): void {
    if (scores === this.shown) return;
    const first = this.shown === null;
    this.shown = scores;
    const before = new Map<number, number>();
    for (const [id, r] of this.rows) before.set(id, r.node.getBoundingClientRect().top);
    const leader = Math.max(1, ...scores.map((s) => s.score));
    const now = performance.now();
    scores.forEach((s, i) => {
      const row = this.rows.get(s.playerId) ?? this.addRow(s);
      row.rank.textContent = String(i + 1);
      row.node.classList.toggle('out', s.defeated);
      row.node.title = s.defeated ? hu.side.defeated : '';
      row.node.classList.toggle('lead', i === 0 && s.score > 0);
      row.fill.style.width = `${Math.max(2, (s.score / leader) * 100)}%`;
      if (s.score !== row.target) {
        if (!first && s.score > row.target) this.pulse(row.value);
        row.from = first ? s.score : row.shown;
        row.target = s.score;
        row.start = now;
      }
      if (this.root.children[i] !== row.node) this.root.insertBefore(row.node, this.root.children[i] ?? null);
    });
    this.slide(before);
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }

  private addRow(s: ScoreRowInfo): Row {
    const rank = el('span', { class: 'sc-rank' });
    const value = el('span', { class: 'sc-score' }, '0');
    const fill = el('i');
    const name = el('span', { class: 'sc-name' }, el('span', { class: 'sc-civ' }, hu.civs[s.civ]));
    if (s.isHuman) name.append(el('em', { class: 'sc-you' }, hu.side.you));
    const node = el(
      'div',
      { class: s.isHuman ? 'sc-row you' : 'sc-row', style: `--pc:${hex(s.color)}` },
      rank,
      el('span', { class: 'sc-crest' }, hu.civs[s.civ].charAt(0)),
      name,
      value,
      el('span', { class: 'sc-bar' }, fill),
    );
    const row: Row = { node, rank, value, fill, shown: s.score, from: s.score, target: s.score, start: 0 };
    value.textContent = grouped(s.score);
    this.rows.set(s.playerId, row);
    return row;
  }

  /** Rows that changed place glide from where they were (FLIP). */
  private slide(before: ReadonlyMap<number, number>): void {
    for (const [id, r] of this.rows) {
      const top = before.get(id);
      if (top === undefined) continue;
      const dy = top - r.node.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) continue;
      r.node.style.transition = 'none';
      r.node.style.transform = `translateY(${dy}px)`;
      void r.node.offsetHeight;
      r.node.style.transition = `transform ${MOVE_MS}ms var(--ease)`;
      r.node.style.transform = '';
    }
  }

  private pulse(node: HTMLElement): void {
    node.classList.remove('up');
    void node.offsetWidth;
    node.classList.add('up');
  }

  private readonly tick = (): void => {
    this.raf = 0;
    const now = performance.now();
    let busy = false;
    for (const r of this.rows.values()) {
      if (r.shown === r.target) continue;
      const t = Math.min(1, (now - r.start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      r.shown = t >= 1 ? r.target : Math.round(r.from + (r.target - r.from) * eased);
      r.value.textContent = grouped(r.shown);
      if (t < 1) busy = true;
    }
    if (busy) this.raf = requestAnimationFrame(this.tick);
  };

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.rows.clear();
  }
}
