import type { GameOverPlayerRow } from '../../game/gameOverStats';
import type { VictoryCause } from '../../game/VictoryChecker';
import { hu } from '../../i18n/hu';
import { el, formatClock, uiRoot } from '../dom';
import { icons } from '../icons';
import { gameOverRowView } from './gameOverView';
import '../hud.css';
import '../screens.css';

/** What the game-over card shows. */
export interface GameOverInfo {
  readonly victory: boolean;
  readonly durationMs: number;
  readonly cause: VictoryCause;
  readonly players: readonly GameOverPlayerRow[];
}

/** Victory / defeat card shown over the paused game, with the player table. */
export class GameOver {
  private readonly root: HTMLElement;

  constructor({ victory, durationMs, cause, players }: GameOverInfo, onBack: () => void) {
    const back = el('button', { class: 'btn btn-primary', type: 'button' }, hu.gameOver.backToMenu);
    back.addEventListener('click', onBack);
    this.root = el(
      'div',
      { class: 'screen gameover' },
      el(
        'div',
        // A modal card: game keys (onKeyAction) stand aside, so Tab moves focus here.
        {
          class: 'glass gameover-card',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': victory ? hu.gameOver.victoryTitle : hu.gameOver.defeatTitle,
        },
        el('div', { class: 'gameover-kicker' }, hu.gameOver.statsHeader),
        el(
          'h2',
          { class: `gameover-title ${victory ? 'win' : 'lose'}` },
          victory ? hu.gameOver.victoryTitle : hu.gameOver.defeatTitle,
        ),
        el(
          'div',
          { class: `gameover-cause ${cause}` },
          el('span', {}, hu.gameOver.causeLabel),
          el('span', { class: 'sep' }, '·'),
          el('b', {}, hu.gameOver.causes[cause]),
        ),
        el('p', { class: 'gameover-body' }, hu.gameOver.bodies[cause][victory ? 'victory' : 'defeat']),
        el(
          'div',
          { class: 'gameover-stats' },
          el('span', { class: 'stat' }, el('span', { html: icons.clock }), el('span', {}, hu.gameOver.durationLabel), el('b', {}, formatClock(durationMs))),
        ),
        playerTable(players),
        back,
      ),
    );
    uiRoot().append(this.root);
  }

  destroy(): void {
    this.root.remove();
  }
}

/** One row per player: swatch, civ, who (you / difficulty · personality), age, outcome. */
function playerTable(players: readonly GameOverPlayerRow[]): HTMLElement {
  const rows = players.map((p, i) => {
    const v = gameOverRowView(p);
    const row = el(
      'div',
      { class: `gameover-row${v.isHuman ? ' human' : ''}`, role: 'row' },
      el('span', { class: 'gameover-swatch', 'aria-hidden': 'true' }),
      el('span', { class: 'gameover-civ', role: 'cell' }, v.civ),
      el('span', { class: 'gameover-who', role: 'cell' }, v.who),
      el('span', { class: 'gameover-age', role: 'cell' }, v.age),
      el('span', { class: `gameover-outcome ${v.outcomeId}`, role: 'cell' }, v.outcome),
    );
    row.style.setProperty('--swatch', v.swatch);
    row.style.setProperty('--i', String(i));
    return row;
  });
  return el(
    'div',
    { class: 'gameover-players' },
    el('div', { class: 'gameover-players-title' }, hu.gameOver.players),
    el('div', { class: 'gameover-table', role: 'table', 'aria-label': hu.gameOver.players }, ...rows),
  );
}
