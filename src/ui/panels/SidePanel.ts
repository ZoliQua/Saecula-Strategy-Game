import { hu } from '../../i18n/hu';
import { el } from '../dom';
import { icons } from '../icons';
import { settingsStore } from '../settings';
import { uiStore, type SidePanelState, type SidePanelView, type UiStore } from '../store';
import { ScoreView } from './ScoreView';
import { VillagerView } from './VillagerView';
import '../sidePanel.css';

const VIEWS: readonly SidePanelView[] = ['score', 'villagers'];

/**
 * The collapsible glass panel on the right edge, between the clock and
 * the build panel (M7 Decision 9). Two views, "Pontszám" and
 * "Falusiak", switch under tabs with a sliding amber marker; the fold
 * button (or the scorePanel key) slides the panel off to a slim tab.
 * Its open state and view live in the UI store and are never saved.
 */
export class SidePanel {
  readonly root: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly handle: HTMLButtonElement;
  private readonly fold: HTMLButtonElement;
  private readonly tabs = new Map<SidePanelView, HTMLButtonElement>();
  private readonly views = new Map<SidePanelView, HTMLElement>();
  private readonly idleBadge: HTMLElement;
  private readonly score = new ScoreView();
  private readonly villagers = new VillagerView();
  private shownPanel: SidePanelState | null = null;
  private shownKey = '';

  constructor() {
    this.idleBadge = el('b', { class: 'sp-badge' });
    const tabList = el('div', { class: 'sp-tabs', role: 'tablist' }, el('i', { class: 'sp-ink' }));
    for (const v of VIEWS) {
      const label = v === 'score' ? hu.side.score : hu.side.villagers;
      const tab = el(
        'button',
        { class: 'sp-tab', type: 'button', role: 'tab', 'data-view': v },
        el('span', { class: 'sp-tab-icon', html: v === 'score' ? icons.trophy : icons.pop }),
        el('span', {}, label),
        v === 'villagers' ? this.idleBadge : null,
      );
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        uiStore.getState().showSidePanel(v);
      });
      tabList.append(tab);
      this.tabs.set(v, tab);
    }
    this.fold = el('button', { class: 'sp-fold', type: 'button', html: icons.chevron });
    this.fold.addEventListener('click', (e) => {
      e.stopPropagation();
      uiStore.getState().toggleSidePanel();
    });
    const body = el('div', { class: 'sp-views' });
    this.views.set('score', el('section', { class: 'sp-view', role: 'tabpanel' }, this.score.root));
    this.views.set('villagers', el('section', { class: 'sp-view', role: 'tabpanel' }, this.villagers.root));
    for (const v of VIEWS) body.append(this.views.get(v)!);
    this.panel = el('aside', { class: 'glass side-panel' }, el('header', { class: 'sp-head' }, tabList, this.fold), body);
    this.handle = el(
      'button',
      { class: 'glass sp-handle', type: 'button' },
      el('span', { class: 'sp-handle-icon', html: icons.trophy }),
      el('span', { class: 'sp-handle-text' }, hu.side.score),
    );
    this.handle.addEventListener('click', (e) => {
      e.stopPropagation();
      uiStore.getState().toggleSidePanel();
    });
    this.root = el('div', { class: 'side-wrap anim-in' }, this.panel, this.handle);
  }

  render(state: UiStore): void {
    this.score.render(state.scores);
    this.villagers.render(state.villagerCounts);
    const idle = state.villagerCounts.idle;
    this.idleBadge.textContent = idle > 0 ? String(idle) : '';
    this.idleBadge.classList.toggle('show', idle > 0);
    // Tooltips name the key as bound now (the settings card may have moved it).
    const key = settingsStore.getState().keys.scorePanel.label;
    if (key !== this.shownKey) {
      this.shownKey = key;
      this.fold.title = hu.side.collapse(key);
      this.handle.title = hu.side.expand(key);
    }
    const panel = state.sidePanel;
    if (panel === this.shownPanel) return;
    this.shownPanel = panel;
    this.root.classList.toggle('folded', !panel.open);
    this.panel.setAttribute('aria-hidden', String(!panel.open));
    this.root.dataset['view'] = panel.view;
    for (const v of VIEWS) {
      const active = v === panel.view;
      this.tabs.get(v)!.classList.toggle('active', active);
      this.tabs.get(v)!.setAttribute('aria-selected', String(active));
      this.views.get(v)!.classList.toggle('active', active);
    }
  }

  destroy(): void {
    this.score.destroy();
    this.root.remove();
  }
}
