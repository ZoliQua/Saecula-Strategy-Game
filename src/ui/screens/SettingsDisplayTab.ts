import { hu } from '../../i18n/hu';
import { el } from '../dom';
import { settingsStore, TEAM_PALETTES, type SettingsStore, type TeamPalette } from '../settings';
import { Segmented } from './Segmented';
import '../setup.css';

const PALETTE_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-.9 2-1.8 0-1.3-1.1-1.5-1.1-2.7 0-.9.7-1.5 1.6-1.5H17a3.5 3.5 0 0 0 3.5-3.5C20.5 6.7 16.7 3.5 12 3.5Z"/><path d="M7.5 11h.01M10 7.8h.01M14.2 7.8h.01"/></svg>`;

/** The settings card's "Megjelenítés" tab: the team-colour palette (applies from the next match). */
export class SettingsDisplayTab {
  readonly root: HTMLElement;
  private readonly palette: Segmented<TeamPalette>;

  constructor(after: (change: () => void) => void) {
    const t = hu.settings;
    this.palette = new Segmented(
      'palette',
      t.teamPalette,
      TEAM_PALETTES.map((p) => ({ value: p, label: t.teamPalettes[p] })),
      settingsStore.getState().teamPalette,
      (v) => after(() => settingsStore.getState().setTeamPalette(v)),
    );
    this.root = el(
      'div',
      { class: 'set-tab-content' },
      el(
        'section',
        { class: 'set-section', style: '--i:0' },
        el('header', { class: 'set-section-head' }, el('span', { class: 'set-section-icon', html: PALETTE_ICON }), el('h3', {}, t.teamColors)),
        el(
          'div',
          { class: 'set-panel set-controls' },
          el('div', { class: 'set-control' }, el('span', { class: 'set-label' }, t.teamPalette), this.palette.root),
          el('p', { class: 'set-hint' }, t.teamPaletteNote),
        ),
      ),
    );
  }

  sync(s: SettingsStore): void {
    this.palette.set(s.teamPalette);
  }

  focusFirst(): void {
    this.root.querySelector<HTMLButtonElement>('button[aria-checked="true"]')?.focus({ preventScroll: true });
  }
}
