import { AVAILABLE_CIVS, CIV_IDS } from '../../config/civs';
import { hu } from '../../i18n/hu';
import { el, uiRoot } from '../dom';
import { icons } from '../icons';
import '../hud.css';
import '../screens.css';
import '../setup.css';

/** `.e-up` entrance length (screens.css `.enter .e-up`), shared with GameSetup. */
export const E_UP_S = 0.7;
/** The footer enters last. */
const FOOT_DELAY_S = 1.12;
/** When the menu's entrance has fully played (the footer is the last to land). */
export const MENU_ENTRANCE_MS = Math.round((FOOT_DELAY_S + E_UP_S) * 1000);

const ARROW = `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>`;

/**
 * Main menu overlay: editorial hero copy on the left over the live
 * map diorama rendered by MainMenuScene.
 */
export class MainMenu {
  private readonly root: HTMLElement;
  private readonly hero: HTMLElement;
  private readonly teardown: number;
  private readonly loadBtn: HTMLButtonElement;
  private readonly settingsBtn: HTMLButtonElement;
  private readonly statsBtn: HTMLButtonElement;

  constructor(onNewGame: () => void, onLoadGame: () => void, onSettings: () => void, onStats: () => void) {
    const play = el(
      'button',
      { class: 'btn btn-primary e-up', type: 'button', style: 'animation-delay:.78s' },
      el('span', {}, hu.menu.newGame),
      el('span', { class: 'arrow', html: ARROW }),
    );
    play.addEventListener('click', onNewGame);
    const load = el(
      'button',
      { class: 'btn btn-ghost btn-load e-up', type: 'button', style: 'animation-delay:.86s' },
      el('span', {}, hu.menu.loadGame),
      el('span', { class: 'arrow', html: ARROW }),
    );
    load.addEventListener('click', onLoadGame);
    this.loadBtn = load;
    const stats = el(
      'button',
      { class: 'btn btn-ghost btn-load e-up', type: 'button', style: 'animation-delay:.94s' },
      el('span', {}, hu.menu.stats),
      el('span', { class: 'arrow', html: ARROW }),
    );
    stats.addEventListener('click', onStats);
    this.statsBtn = stats;
    const settings = el(
      'button',
      { class: 'btn btn-ghost btn-load e-up', type: 'button', style: 'animation-delay:1.02s' },
      el('span', {}, hu.menu.settings),
      el('span', { class: 'arrow', html: ARROW }),
    );
    settings.addEventListener('click', onSettings);
    this.settingsBtn = settings;

    const [line1 = '', line2 = ''] = hu.menu.headline.split('\n');
    this.hero = el(
      'main',
      { class: 'menu-hero' },
      el('div', { class: 'eyebrow e-up', style: 'animation-delay:.2s' }, hu.menu.eyebrow),
      el(
        'h1',
        { class: 'menu-title' },
        el('span', { class: 'row' }, el('span', { class: 'rise' }, line1)),
        el('span', { class: 'row' }, el('span', { class: 'rise' }, line2)),
      ),
      el('p', { class: 'menu-tagline e-up', style: 'animation-delay:.62s' }, hu.menu.tagline),
      el('div', { class: 'menu-actions' }, play, load, stats, settings),
    );
    this.root = el(
      'div',
      { class: 'screen menu enter' },
      el('div', { class: 'menu-shade' }),
      el(
        'header',
        { class: 'menu-nav' },
        el('div', { class: 'menu-brand e-down', style: 'animation-delay:.05s' }, el('span', { class: 'brand-mark', html: icons.mark }), el('span', {}, hu.title)),
        el(
          'div',
          { class: 'menu-feats' },
          ...hu.menu.features(AVAILABLE_CIVS.length, CIV_IDS.length - AVAILABLE_CIVS.length).map((f, i) => el('span', { class: 'menu-feat e-down', style: `animation-delay:${0.14 + i * 0.06}s` }, f)),
        ),
      ),
      this.hero,
      el(
        'footer',
        { class: 'menu-foot e-up', style: `animation-delay:${FOOT_DELAY_S}s` },
        el('span', {}, hu.subtitle),
        el('span', {}, hu.menu.footer),
      ),
    );
    uiRoot().append(this.root);
    // Drop the entrance class once it has played so nothing re-animates.
    this.teardown = window.setTimeout(() => this.root.classList.remove('enter'), 2200);
  }

  /** A short notice under the menu buttons (e.g. a save that could not be loaded); it fades by itself. */
  notice(message: string): void {
    this.hero.querySelector('.menu-notice')?.remove();
    this.hero.append(el('div', { class: 'menu-notice', role: 'status' }, message));
  }

  /** Steps the hero copy aside while the setup card (or the load list, the statistics or the settings) is open. */
  setAway(away: boolean): void {
    this.root.classList.toggle('away', away);
  }

  /** Gives the keyboard focus back to the button whose card just closed. */
  focusButton(which: 'load' | 'settings' | 'stats'): void {
    const button = { load: this.loadBtn, settings: this.settingsBtn, stats: this.statsBtn }[which];
    button.focus({ preventScroll: true });
  }

  destroy(): void {
    window.clearTimeout(this.teardown);
    this.root.remove();
  }
}
