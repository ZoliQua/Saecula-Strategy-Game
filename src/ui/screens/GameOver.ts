import { hu } from '../../i18n/hu';
import { el, formatClock, uiRoot } from '../dom';
import { icons } from '../icons';
import '../hud.css';
import '../screens.css';

/** Victory / defeat card shown over the paused game. */
export class GameOver {
  private readonly root: HTMLElement;

  constructor(victory: boolean, durationMs: number, onBack: () => void) {
    const back = el('button', { class: 'btn btn-primary', type: 'button' }, hu.gameOver.backToMenu);
    back.addEventListener('click', onBack);
    this.root = el(
      'div',
      { class: 'screen gameover' },
      el(
        'div',
        { class: 'glass gameover-card' },
        el('div', { class: 'gameover-kicker' }, hu.gameOver.statsHeader),
        el(
          'h2',
          { class: `gameover-title ${victory ? 'win' : 'lose'}` },
          victory ? hu.gameOver.victoryTitle : hu.gameOver.defeatTitle,
        ),
        el('p', { class: 'gameover-body' }, victory ? hu.gameOver.victoryBody : hu.gameOver.defeatBody),
        el(
          'div',
          { class: 'gameover-stats' },
          el('span', { class: 'stat' }, el('span', { html: icons.clock }), el('span', {}, hu.gameOver.durationLabel), el('b', {}, formatClock(durationMs))),
        ),
        back,
      ),
    );
    uiRoot().append(this.root);
  }

  destroy(): void {
    this.root.remove();
  }
}
