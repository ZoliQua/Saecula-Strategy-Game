import { audio } from '../../audio/AudioManager';
import { CIV_DEFS } from '../../config/civs';
import { hu } from '../../i18n/hu';
import type { MatchLogRead } from '../../stats/matchLog';
import { humanScore, summarize, type MatchGroup, type MatchRecord, type MatchSummary } from '../../stats/matchRecord';
import type { CivId } from '../../types';
import { el, uiRoot } from '../dom';
import { icons } from '../icons';
import { bindModalKeys, GLYPHS } from './modalKeys';
import { exportDate, exportPayload, formatLength, formatRate, formatWhen, grouped } from './statsView';
import '../hud.css';
import '../screens.css';
import '../pause.css';
import '../stats.css';

const COUNT_MS = 900;
const EXPORT_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M5 17.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1.5"/></svg>`;
const CHART_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16"/><rect x="5.5" y="11" width="3" height="6" rx="0.6"/><rect x="10.5" y="6" width="3" height="11" rx="0.6"/><rect x="15.5" y="13" width="3" height="4" rx="0.6"/></svg>`;
const SCROLL_ICON = `<svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9h22a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4h-2v20a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4v0a4 4 0 0 1 4-4h2Z"/><path d="M14 9a4 4 0 0 0-4 4v0a4 4 0 0 0 4 4M20 22h8M20 28h6"/></svg>`;

const css = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;
/** Perceived lightness 0..1 of 0xRRGGBB. */
const lightness = (c: number): number => (0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255)) / 255;

/** A small heraldic shield in the civ's colours with its initial. */
function crest(civ: CivId): HTMLElement {
  const { primary, secondary } = CIV_DEFS[civ].heraldry;
  const node = el('span', { class: 'st-crest', 'aria-hidden': 'true' }, hu.civs[civ].charAt(0));
  node.style.setProperty('--c1', css(primary));
  node.style.setProperty('--c2', css(secondary));
  node.style.setProperty('--ci', lightness(primary) > 0.6 ? '#2a1a0c' : '#fff8ec');
  return node;
}

/**
 * The statistics card (main menu "Statisztika"): totals, win rate by the
 * human's civ and by difficulty, the most recent matches, and an export
 * of the whole log as one JSON file. It shows placeholders until `show`
 * hands it the log. Back (or Esc) runs `onBack`.
 */
export class StatsScreen {
  private readonly root: HTMLElement;
  private readonly card: HTMLElement;
  private readonly body: HTMLElement;
  private readonly status: HTMLElement;
  private readonly exportBtn: HTMLButtonElement;
  private readonly unbindKeys: () => void;
  private records: readonly MatchRecord[] = [];
  private raf = 0;

  constructor(private readonly onBack: () => void) {
    audio().playSFX('ui_panel_open');
    const back = el('button', { class: 'btn btn-ghost btn-back slots-back', type: 'button' }, el('span', { class: 'arrow', html: GLYPHS.back }), el('span', {}, hu.common.back));
    back.addEventListener('click', () => this.onBack());
    this.exportBtn = el('button', { class: 'btn btn-primary st-export', type: 'button', disabled: true }, el('span', { class: 'arrow', html: EXPORT_ICON }), el('span', {}, hu.stats.export));
    this.exportBtn.addEventListener('click', () => this.exportAll());
    this.body = el('div', { class: 'st-body' }, ...skeleton());
    this.status = el('div', { class: 'slots-status', role: 'status', 'aria-live': 'polite' });
    this.card = el(
      'div',
      { class: 'glass stats-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': hu.stats.title },
      el(
        'div',
        { class: 'pause-head' },
        el('div', { class: 'eyebrow pause-kicker' }, hu.stats.kicker),
        el('h2', { class: 'pause-title' }, hu.stats.title),
        el('div', { class: 'pause-ornament', 'aria-hidden': 'true' }, el('span', {}), el('i', {}), el('span', {})),
      ),
      this.body,
      this.status,
      el('div', { class: 'slots-foot' }, back, el('div', { class: 'pause-foot' }, el('kbd', {}, 'Esc'), el('span', {}, hu.common.back)), this.exportBtn),
    );
    this.root = el('div', { class: 'screen pause-layer' }, this.card);
    uiRoot().append(this.root);
    this.unbindKeys = bindModalKeys(this.card, () => this.onBack());
    back.focus({ preventScroll: true });
  }

  /** Fills the card from the read log. */
  show(read: MatchLogRead): void {
    this.records = read.records;
    const summary = summarize(read.records);
    const notes: HTMLElement[] = [];
    if (!read.ok) notes.push(el('div', { class: 'st-note error' }, el('span', { html: GLYPHS.warn }), el('span', {}, hu.stats.unavailable)));
    if (read.corrupt > 0) notes.push(el('div', { class: 'st-note' }, el('span', { html: GLYPHS.warn }), el('span', {}, hu.stats.corrupt(read.corrupt))));
    this.body.replaceChildren(...notes, ...(summary.matches === 0 ? [emptyState()] : this.content(summary)));
    this.exportBtn.disabled = summary.matches === 0;
    // Bars grow and numbers count up once the rows are in the page.
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => {
      for (const bar of this.body.querySelectorAll<HTMLElement>('[data-fill]')) bar.style.width = bar.dataset.fill ?? '0%';
      this.countUp(performance.now());
    });
  }

  /** Plays the exit animation (the owner removes the card shortly after). */
  leave(): void {
    this.root.classList.add('leaving');
    this.root.inert = true;
    this.unbindKeys();
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.unbindKeys();
    this.root.remove();
  }

  private content(s: MatchSummary): HTMLElement[] {
    const kpis = el(
      'div',
      { class: 'st-kpis' },
      kpi(0, icons.trophy, hu.stats.kpis.matches, s.matches, String, hu.stats.record(s.wins, s.defeats, s.abandoned)),
      kpi(1, CHART_ICON, hu.stats.kpis.winRate, Math.round((s.winRate ?? 0) * 100), (v) => formatRate(v / 100), null, s.winRate ?? 0),
      kpi(2, icons.clock, hu.stats.kpis.avgLength, s.avgDurationMs ?? 0, (v) => formatLength(v)),
      kpi(3, icons.mark, hu.stats.kpis.bestScore, s.bestScore ?? 0, grouped),
    );
    const groupsRow = el(
      'div',
      { class: 'st-groups' },
      groupPanel(4, hu.stats.byCiv, s.byCiv, (k) => [crest(k), el('span', { class: 'st-gname' }, hu.civs[k])]),
      groupPanel(5, hu.stats.byDifficulty, s.byDifficulty, (k) => [el('span', { class: `st-diff d-${k}`, 'aria-hidden': 'true' }), el('span', { class: 'st-gname' }, hu.setup.difficulties[k])]),
    );
    const list = el('div', { class: 'st-list', role: 'list' }, ...s.recent.map(matchRow));
    const recent = el(
      'section',
      { class: 'st-panel st-recent', style: '--i:6' },
      el('header', { class: 'st-panel-head' }, el('h3', {}, hu.stats.recent), el('span', { class: 'st-hint' }, hu.stats.recentHint(s.recent.length, s.matches))),
      list,
    );
    return [kpis, groupsRow, recent];
  }

  private countUp(start: number): void {
    const nodes = [...this.body.querySelectorAll<HTMLElement>('[data-count]')];
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      for (const n of nodes) n.textContent = KPI_FORMATS.get(n)?.(Number(n.dataset.count) * eased) ?? '';
      if (t < 1) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  /** Downloads every record as one JSON file through an object URL. */
  private exportAll(): void {
    if (this.records.length === 0) return;
    const now = new Date();
    const url = URL.createObjectURL(new Blob([exportPayload(this.records, now)], { type: 'application/json' }));
    const a = el('a', { href: url, download: hu.stats.exportFile(exportDate(now)), class: 'st-download' });
    document.body.append(a);
    a.click();
    a.remove();
    // The download has its own reference; the URL can go once the click has been handled.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    audio().playSFX('ui_click');
    this.status.replaceChildren(el('div', { class: 'slots-notice ok' }, hu.stats.exported));
  }
}

/** The number formatter of each counting KPI value. */
const KPI_FORMATS = new WeakMap<HTMLElement, (v: number) => string>();

function kpi(i: number, icon: string, label: string, value: number, format: (v: number) => string, sub: string | null = null, ring: number | null = null): HTMLElement {
  const num = el('b', { class: 'st-kpi-value', 'data-count': value }, format(0));
  KPI_FORMATS.set(num, format);
  const tile = el(
    'div',
    { class: 'st-kpi', style: `--i:${i}` },
    el('span', { class: 'st-kpi-icon', html: icon }),
    el('span', { class: 'st-kpi-label' }, label),
    num,
    sub ? el('span', { class: 'st-kpi-sub' }, sub) : null,
  );
  if (ring !== null) tile.append(el('span', { class: 'st-kpi-meter' }, el('i', { 'data-fill': `${Math.round(ring * 100)}%` })));
  return tile;
}

function groupPanel<K extends string>(i: number, title: string, groups: readonly MatchGroup<K>[], label: (k: K) => HTMLElement[]): HTMLElement {
  const rows = groups.map((g, j) =>
    el(
      'div',
      { class: 'st-grow', style: `--j:${j}` },
      el('span', { class: 'st-glabel' }, ...label(g.key)),
      el('span', { class: 'st-gbar' }, el('i', { 'data-fill': `${Math.max(2, Math.round(g.winRate * 100))}%` })),
      el('span', { class: 'st-gcount' }, hu.stats.groupCount(g.wins, g.matches)),
      el('b', { class: 'st-grate' }, formatRate(g.winRate)),
    ),
  );
  return el('section', { class: 'st-panel', style: `--i:${i}` }, el('header', { class: 'st-panel-head' }, el('h3', {}, title)), el('div', { class: 'st-grows' }, ...rows));
}

function matchRow(r: MatchRecord, j: number): HTMLElement {
  const sep = (): HTMLElement => el('span', { class: 'sep' }, '·');
  return el(
    'div',
    { class: `st-match ${r.outcome}`, role: 'listitem', style: `--j:${Math.min(j, 12)}` },
    crest(r.setup.civ),
    el(
      'span',
      { class: 'st-mmain' },
      el('span', { class: 'st-mciv' }, hu.civs[r.setup.civ]),
      el('span', { class: 'st-mwhen' }, formatWhen(r.createdAt)),
    ),
    el(
      'span',
      { class: 'st-mmeta' },
      el('span', {}, `${hu.setup.templates[r.map.template].name} · ${hu.setup.sizes[r.map.mapSize]}`),
      el('span', { class: 'st-msub' }, hu.setup.difficulties[r.setup.difficulty], sep(), hu.stats.opponents(r.setup.aiCount)),
    ),
    el('span', { class: 'st-mlen' }, el('span', { html: icons.clock }), formatLength(r.durationMs)),
    el('span', { class: `st-badge ${r.outcome}` }, hu.stats.outcomes[r.outcome]),
    el('span', { class: 'st-mscore' }, el('b', {}, grouped(humanScore(r))), el('span', {}, hu.stats.scoreLabel)),
  );
}

function emptyState(): HTMLElement {
  return el(
    'div',
    { class: 'st-empty' },
    el('span', { class: 'st-empty-icon', html: SCROLL_ICON }),
    el('h3', {}, hu.stats.emptyTitle),
    el('p', {}, hu.stats.emptyBody),
  );
}

/** Placeholders while the log is read. */
function skeleton(): HTMLElement[] {
  return [
    el('div', { class: 'st-kpis' }, ...[0, 1, 2, 3].map((i) => el('div', { class: 'st-kpi skeleton', style: `--i:${i}` }, el('i'), el('i')))),
    el('div', { class: 'st-panel skeleton', style: '--i:4' }, el('i'), el('i'), el('i')),
  ];
}
