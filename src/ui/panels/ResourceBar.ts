import { hu } from '../../i18n/hu';
import type { ResourceType } from '../../types';
import { el } from '../dom';
import { icons } from '../icons';
import { uiStore, type UiStore } from '../store';

const RESOURCES: readonly ResourceType[] = ['food', 'wood', 'gold'];
const COUNT_MS = 450;

interface Counter {
  node: HTMLElement;
  wrap: HTMLElement;
  shown: number;
  target: number;
  from: number;
  start: number;
}

/** Top resource pill: animated counters with +/- feedback; the population counter opens the villager view. */
export class ResourceBar {
  readonly root: HTMLElement;
  private readonly counters = new Map<ResourceType, Counter>();
  private readonly popText: HTMLElement;
  private readonly popMeter: HTMLElement;
  private raf = 0;
  private primed = false;

  constructor() {
    this.root = el('div', { class: 'glass resbar anim-in' });
    for (const r of RESOURCES) {
      const val = el('span', { class: 'res-val' }, '0');
      const wrap = el(
        'div',
        { class: 'res', title: hu.resources[r] },
        el('span', { class: 'res-icon', html: icons[r] }),
        val,
        el('span', { class: 'res-label' }, hu.resources[r]),
      );
      this.root.append(wrap);
      this.counters.set(r, { node: val, wrap, shown: 0, target: 0, from: 0, start: 0 });
    }
    this.popText = el('span', { class: 'res-val' }, '0/0');
    this.popMeter = el('span', { class: 'pop-meter' }, el('i'));
    // The population counter opens the side panel on the villager view.
    const pop = el(
      'div',
      { class: 'res pop-btn', title: hu.hud.populationTip, role: 'button' },
      el('span', { class: 'res-icon', html: icons.pop }),
      this.popText,
      this.popMeter,
    );
    pop.addEventListener('click', (e) => {
      e.stopPropagation();
      uiStore.getState().showSidePanel('villagers');
    });
    this.root.append(pop);
  }

  render(state: UiStore): void {
    const now = performance.now();
    for (const r of RESOURCES) {
      const c = this.counters.get(r)!;
      const value = Math.floor(state.resources[r]);
      if (value === c.target) continue;
      const diff = value - c.target;
      c.from = this.primed ? c.shown : value;
      c.target = value;
      c.start = now;
      if (this.primed) this.flash(c, diff);
    }
    this.primed = true;
    const { current, cap } = state.population;
    this.popText.textContent = `${current}/${cap}`;
    const meter = this.popMeter.firstElementChild as HTMLElement;
    meter.style.width = `${cap > 0 ? Math.min(100, (current / cap) * 100) : 0}%`;
    this.popMeter.classList.toggle('full', current >= cap);
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }

  private flash(c: Counter, diff: number): void {
    c.node.classList.remove('up', 'down');
    void c.node.offsetWidth;
    c.node.classList.add(diff > 0 ? 'up' : 'down');
    window.setTimeout(() => c.node.classList.remove('up', 'down'), 500);
    if (diff > 0 && diff < 1000) {
      const f = el('span', { class: 'res-float' }, `+${diff}`);
      c.wrap.append(f);
      window.setTimeout(() => f.remove(), 1000);
    }
  }

  private readonly tick = (): void => {
    this.raf = 0;
    const now = performance.now();
    let busy = false;
    for (const c of this.counters.values()) {
      if (c.shown === c.target) continue;
      const t = Math.min(1, (now - c.start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      c.shown = t >= 1 ? c.target : Math.round(c.from + (c.target - c.from) * eased);
      c.node.textContent = String(c.shown);
      if (t < 1) busy = true;
    }
    if (busy) this.raf = requestAnimationFrame(this.tick);
  };

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.root.remove();
  }
}
