import type { AIThoughts, Thought } from '../../ai/thoughts';
import { hu } from '../../i18n/hu';
import { el, formatClock, uiRoot } from '../dom';
import { hex } from '../format';
import './aiThoughts.css';

/** One AI as the overlay shows it. */
export interface AIThoughtSource {
  readonly playerId: number;
  readonly color: number;
  readonly age: number;
  readonly thoughts: AIThoughts | undefined;
}

const REFRESH_MS = 500;
const t = hu.dev.aiThoughts;

/** Names a unit / building / tech / resource id in Hungarian; anything else (coords, counts) as is. */
function label(id: string): string {
  const units = hu.units as Record<string, string>;
  const buildings = hu.buildings as Record<string, string>;
  const techs = hu.techs as Record<string, { name: string }>;
  const resources = hu.resources as Record<string, string>;
  if (id.includes('>')) return id.split('>').map(label).join(' → ');
  return units[id] ?? buildings[id] ?? techs[id]?.name ?? resources[id] ?? t.stances[id] ?? (t.kinds as Record<string, string>)[id] ?? id;
}

function thoughtLine(th: Thought): HTMLElement {
  return el(
    'li',
    {},
    el('span', { class: 'ait-time' }, formatClock(th.timeMs)),
    el('span', { class: `ait-kind k-${th.kind}` }, t.kinds[th.kind]),
    el('span', { class: 'ait-detail' }, label(th.detail)),
  );
}

/**
 * Dev-only AI thoughts overlay (PROGRAM_TERV.md §10.4): per AI its
 * strategy, phase, planned steps and latest decisions. Toggled with `
 * or F9. Loaded through a dynamic import behind import.meta.env.DEV, so
 * production bundles never contain it.
 */
export class AIThoughtsOverlay {
  private readonly root: HTMLElement;
  private readonly list: HTMLElement;
  private timer = 0;
  private visible = false;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.code === 'Backquote' || e.key === 'F9') this.toggle();
  };

  constructor(private readonly sources: () => readonly AIThoughtSource[]) {
    this.list = el('div', { class: 'ait-list' });
    this.root = el(
      'aside',
      { class: 'glass ai-thoughts', 'aria-hidden': 'true' },
      el('div', { class: 'panel-title ait-head' }, el('span', {}, t.title), el('span', { class: 'ait-hint' }, t.hint)),
      this.list,
    );
    uiRoot().append(this.root);
    window.addEventListener('keydown', this.onKey);
  }

  toggle(force?: boolean): void {
    this.visible = force ?? !this.visible;
    this.root.classList.toggle('show', this.visible);
    window.clearInterval(this.timer);
    if (!this.visible) return;
    this.render();
    this.timer = window.setInterval(() => this.render(), REFRESH_MS);
  }

  destroy(): void {
    window.clearInterval(this.timer);
    window.removeEventListener('keydown', this.onKey);
    this.root.remove();
  }

  private render(): void {
    const cards = this.sources().map((s) => this.card(s));
    this.list.replaceChildren(...cards);
  }

  private card(s: AIThoughtSource): HTMLElement {
    const th = s.thoughts;
    const swatch = el('span', { class: 'ait-swatch', style: `background:${hex(s.color)}` });
    const head = el(
      'div',
      { class: 'ait-card-head' },
      swatch,
      el('span', { class: 'ait-player' }, t.player(s.playerId)),
      el('span', { class: 'ait-strategy' }, th ? (t.strategies[th.strategy] ?? th.strategy) : t.none),
      el('span', { class: 'ait-age' }, t.age(s.age)),
    );
    if (!th) return el('section', { class: 'ait-card' }, head);
    const plan = th.plan.length > 0 ? th.plan.map(label).join(' · ') : t.none;
    const recent = el('ol', { class: 'ait-recent' }, ...th.recent.slice(-6).reverse().map(thoughtLine));
    return el(
      'section',
      { class: 'ait-card' },
      head,
      el('div', { class: `ait-phase p-${th.phase}` }, t.phases[th.phase]),
      th.stance === undefined
        ? null
        : el(
            'div',
            { class: 'ait-row' },
            el('span', { class: 'ait-key' }, t.stanceLabel),
            el('span', { class: `ait-stance s-${th.stance}` }, t.stances[th.stance] ?? th.stance),
          ),
      el('div', { class: 'ait-row' }, el('span', { class: 'ait-key' }, t.plan), el('span', { class: 'ait-plan' }, plan)),
      el('div', { class: 'ait-key' }, t.recent),
      recent,
    );
  }
}
