import { audio } from '../../audio/AudioManager';
import { hu } from '../../i18n/hu';
import type { AgeId, BuildingType, Resources, ResourceType, UnitType } from '../../types';
import { el, uiRoot } from '../dom';
import { icons } from '../icons';
import { bindModalKeys, GLYPHS } from './modalKeys';
import type { AgeEntry, TechTreeModel, TreeColumn, TreeTech, TreeTrainer, TreeUnit } from './techTreeModel';
import '../hud.css';
import '../screens.css';
import '../pause.css';
import '../techtree.css';

/** Pictures for the diagram (thumbnails.ts); an empty string falls back to a name chip. */
export interface TreePictures {
  building(type: BuildingType): string;
  unit(type: UnitType): string;
}

const AGE_NAME: Record<AgeId, string> = { 1: hu.ages.roman, 2: hu.ages.medieval, 3: hu.ages.enlightenment };
const RESOURCES: readonly ResourceType[] = ['food', 'wood', 'gold'];
/** Pixels an arrow / page key scrolls the diagram. */
const LINE_STEP = 48;

/**
 * The tech tree pause card (M7 Decision 7): an organogram of the three
 * ages side by side, each with its new buildings, the units under the
 * building that trains them (connector lines), its technologies, and
 * between the columns the age-up step with its cost. The current age
 * glows, later ages are dimmed behind a lock. Esc or back returns; the
 * arrow and page keys scroll the diagram when it does not fit.
 */
export class TechTree {
  private readonly root: HTMLElement;
  private readonly body: HTMLElement;
  private readonly unbindKeys: () => void;
  private readonly onScrollKey = (e: KeyboardEvent): void => this.scrollKey(e);

  constructor(
    private readonly model: TechTreeModel,
    private readonly pictures: TreePictures,
    onBack: () => void,
  ) {
    audio().playSFX('ui_panel_open');
    const back = el(
      'button',
      { class: 'btn btn-ghost btn-back slots-back', type: 'button' },
      el('span', { class: 'arrow', html: GLYPHS.back }),
      el('span', {}, hu.common.back),
    );
    back.addEventListener('click', () => onBack());
    this.body = el('div', { class: 'tree-body' }, this.grid());
    const card = el(
      'div',
      { class: 'glass tree-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': hu.techTree.title },
      el(
        'div',
        { class: 'pause-head tree-head' },
        el('div', { class: 'eyebrow pause-kicker' }, hu.techTree.kicker),
        el('h2', { class: 'pause-title' }, hu.techTree.title),
        el('div', { class: 'pause-ornament', 'aria-hidden': 'true' }, el('span', {}), el('i', {}), el('span', {})),
      ),
      this.body,
      el('div', { class: 'slots-foot' }, back, el('span', { class: 'pause-foot' }, el('kbd', {}, 'Esc'), el('span', {}, hu.common.back))),
    );
    this.root = el('div', { class: 'screen pause-layer tree-layer' }, card);
    uiRoot().append(this.root);
    this.unbindKeys = bindModalKeys(card, onBack);
    window.addEventListener('keydown', this.onScrollKey);
    back.focus({ preventScroll: true });
    // On a narrow window the current age comes into view (sideways only: the diagram starts at its top).
    const current = this.body.querySelector<HTMLElement>('.tree-col.current');
    if (current && this.body.scrollWidth > this.body.clientWidth) {
      this.body.scrollLeft = current.offsetLeft - (this.body.clientWidth - current.offsetWidth) / 2;
    }
  }

  destroy(): void {
    this.unbindKeys();
    window.removeEventListener('keydown', this.onScrollKey);
    this.root.remove();
  }

  private scrollKey(e: KeyboardEvent): void {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const page = this.body.clientHeight - LINE_STEP;
    const dy = { ArrowDown: LINE_STEP, ArrowUp: -LINE_STEP, PageDown: page, PageUp: -page }[e.key];
    const dx = { ArrowRight: LINE_STEP * 2, ArrowLeft: -LINE_STEP * 2 }[e.key];
    if (dy === undefined && dx === undefined) return;
    e.preventDefault();
    this.body.scrollBy({ top: dy ?? 0, left: dx ?? 0, behavior: 'smooth' });
  }

  private grid(): HTMLElement {
    const grid = el('div', { class: 'tree-grid' });
    this.model.columns.forEach((column, i) => {
      if (column.entry) grid.append(this.gate(column, column.entry, i));
      grid.append(this.column(column, i));
    });
    return grid;
  }

  private column(c: TreeColumn, i: number): HTMLElement {
    const state = hu.techTree.states[c.state];
    const badge = el(
      'span',
      { class: 'tree-state' },
      c.state === 'locked' ? el('span', { class: 'tree-lock', html: GLYPHS.lock }) : null,
      c.state === 'past' ? el('span', { class: 'tree-lock', html: GLYPHS.check }) : null,
      state,
    );
    return el(
      'section',
      { class: `tree-col ${c.state}`, style: `--i:${i}`, 'aria-label': `${AGE_NAME[c.age]} — ${state}` },
      el(
        'header',
        { class: 'tree-col-head' },
        el('span', { class: 'tree-num', 'aria-hidden': 'true' }, hu.techTree.numerals[c.age]),
        el('div', { class: 'tree-col-name' }, el('h3', {}, AGE_NAME[c.age]), badge),
      ),
      c.entry ? null : el('div', { class: 'tree-start' }, hu.techTree.startAge),
      this.section(hu.techTree.buildings, el('ul', { class: 'tree-buildings' }, ...c.buildings.map((b) => this.building(b.type, b.cost)))),
      this.section(hu.techTree.training, el('div', { class: 'tree-branches' }, ...c.trainers.map((t) => this.branch(t, c.age)))),
      this.section(
        hu.techTree.techs,
        c.techs.length > 0
          ? el('ul', { class: 'tree-techs' }, ...c.techs.map((t) => this.tech(t)))
          : el('p', { class: 'tree-empty' }, hu.techTree.noTechs),
      ),
    );
  }

  private section(title: string, content: HTMLElement): HTMLElement {
    return el('div', { class: 'tree-sec' }, el('h4', { class: 'tree-sec-title' }, title), content);
  }

  /** The age-up step between two columns: an arrow with the town centre technology's cost. */
  private gate(into: TreeColumn, entry: AgeEntry, i: number): HTMLElement {
    const kind = into.state === 'locked' ? (into.age === this.model.currentAge + 1 ? 'next' : 'far') : 'passed';
    return el(
      'div',
      { class: `tree-gate ${kind}`, style: `--i:${i}`, 'aria-label': `${hu.techTree.entry}: ${hu.techs[entry.tech].name}` },
      el('div', { class: 'tree-gate-arrow', 'aria-hidden': 'true' }, el('i', {}), el('b', { html: icons.chevron })),
      el(
        'div',
        { class: 'tree-gate-badge' },
        el('span', { class: 'tree-gate-icon', html: kind === 'passed' ? GLYPHS.check : GLYPHS.lock }),
        el('span', { class: 'tree-gate-name' }, hu.techs[entry.tech].name),
        this.cost(entry.cost, 'tree-gate-cost'),
        el('span', { class: 'tree-gate-time' }, el('span', { html: icons.clock }), `${entry.time} ${hu.hud.seconds}`),
      ),
    );
  }

  private building(type: BuildingType, cost: Resources): HTMLElement {
    return el(
      'li',
      { class: 'tree-bld', title: hu.buildingRoles[type] },
      this.picture(this.pictures.building(type), hu.buildings[type], 'tree-pic'),
      el('span', { class: 'tree-bld-text' }, el('span', { class: 'tree-name' }, hu.buildings[type]), this.cost(cost)),
    );
  }

  /** A trainer and its units of this column, joined by connector lines. */
  private branch(t: TreeTrainer, age: AgeId): HTMLElement {
    const earlier = t.unlockedIn < age;
    return el(
      'div',
      { class: 'tree-branch' },
      el(
        'div',
        { class: `tree-trainer${earlier ? ' earlier' : ''}` },
        this.picture(this.pictures.building(t.building), hu.buildings[t.building], 'tree-pic small'),
        el('span', { class: 'tree-name' }, hu.buildings[t.building]),
        earlier ? el('span', { class: 'tree-tag' }, `${hu.techTree.numerals[t.unlockedIn]} · ${hu.techTree.earlier}`) : null,
      ),
      el('ul', { class: 'tree-twigs' }, ...t.units.map((u, i) => this.unit(u, i))),
    );
  }

  private unit(u: TreeUnit, i: number): HTMLElement {
    const also = u.alsoAt.length > 0 ? `${hu.techTree.alsoAt} ${u.alsoAt.map((b) => hu.buildings[b]).join(', ')}` : null;
    return el(
      'li',
      { class: 'tree-unit', style: `--j:${i}`, title: hu.unitRoles[u.type] },
      this.picture(this.pictures.unit(u.type), hu.units[u.type], 'tree-portrait'),
      el(
        'span',
        { class: 'tree-bld-text' },
        el('span', { class: 'tree-name' }, hu.units[u.type], u.unique ? el('span', { class: 'tree-unique' }, hu.techTree.unique) : null),
        this.cost(u.cost),
        also ? el('span', { class: 'tree-also' }, also) : null,
      ),
    );
  }

  private tech(t: TreeTech): HTMLElement {
    const name = hu.techs[t.id].name;
    return el(
      'li',
      { class: `tree-tech${t.researched ? ' done' : ''}`, title: `${hu.techs[t.id].role} · ${hu.buildings[t.building]}` },
      this.picture(this.pictures.building(t.building), hu.buildings[t.building], 'tree-pic tiny'),
      el('span', { class: 'tree-tech-name' }, name),
      t.researched ? el('span', { class: 'tree-tech-done', html: GLYPHS.check, 'aria-label': hu.techTree.researched }) : null,
    );
  }

  /** A thumbnail, or (none painted) the name's initial on a glass chip. */
  private picture(src: string, name: string, cls: string): HTMLElement {
    if (src) return el('span', { class: cls }, el('img', { src, alt: '', draggable: 'false' }));
    return el('span', { class: `${cls} tree-chip`, 'aria-hidden': 'true' }, name.slice(0, 1));
  }

  private cost(cost: Resources, cls = 'tree-cost'): HTMLElement {
    const parts = RESOURCES.filter((r) => cost[r] > 0).map((r) =>
      el('span', { class: `tree-res ${r}`, 'aria-label': `${cost[r]} ${hu.resources[r]}` }, el('span', { html: icons[r] }), String(cost[r])),
    );
    return el('span', { class: cls }, ...parts);
  }
}
