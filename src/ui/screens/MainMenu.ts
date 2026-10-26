import { hu } from '../../i18n/hu';
import { el, uiRoot } from '../dom';
import { icons } from '../icons';
import '../hud.css';
import '../screens.css';
import '../setup.css';

const ARROW = `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>`;

/**
 * Main menu overlay: editorial hero copy on the left over the live
 * map diorama rendered by MainMenuScene.
 */
export class MainMenu {
  private readonly root: HTMLElement;
  private readonly teardown: number;

  constructor(onNewGame: () => void) {
    const play = el(
      'button',
      { class: 'btn btn-primary e-up', type: 'button', style: 'animation-delay:.78s' },
      el('span', {}, hu.menu.newGame),
      el('span', { class: 'arrow', html: ARROW }),
    );
    play.addEventListener('click', onNewGame);
    const disabled = (label: string, delay: number) =>
      el(
        'button',
        { class: 'btn btn-ghost e-up', type: 'button', disabled: true, style: `animation-delay:${delay}s` },
        el('span', {}, label),
        el('span', { class: 'soon' }, hu.menu.comingSoon),
      );

    const [line1 = '', line2 = ''] = hu.menu.headline.split('\n');
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
          ...hu.menu.features.map((f, i) => el('span', { class: 'menu-feat e-down', style: `animation-delay:${0.14 + i * 0.06}s` }, f)),
        ),
      ),
      el(
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
        el('div', { class: 'menu-actions' }, play, disabled(hu.menu.loadGame, 0.86), disabled(hu.menu.settings, 0.94)),
      ),
      el(
        'footer',
        { class: 'menu-foot e-up', style: 'animation-delay:1.05s' },
        el('span', {}, hu.subtitle),
        el('span', {}, hu.menu.footer),
      ),
    );
    uiRoot().append(this.root);
    // Drop the entrance class once it has played so nothing re-animates.
    this.teardown = window.setTimeout(() => this.root.classList.remove('enter'), 2200);
  }

  /** Steps the hero copy aside while the setup card is open. */
  setAway(away: boolean): void {
    this.root.classList.toggle('away', away);
  }

  destroy(): void {
    window.clearTimeout(this.teardown);
    this.root.remove();
  }
}
