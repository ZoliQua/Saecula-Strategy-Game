import type { GameOverPlayerRow } from '../../game/gameOverStats';
import { hu } from '../../i18n/hu';
import { hex } from '../format';

/** Display texts of one game-over table row. */
export interface GameOverRowView {
  readonly swatch: string;
  readonly civ: string;
  /** 'Te' for the human; difficulty · personality for an AI. */
  readonly who: string;
  readonly age: string;
  readonly outcome: string;
  readonly outcomeId: GameOverPlayerRow['outcome'];
  readonly isHuman: boolean;
}

/** The texts the game-over card shows for `row` (pure, for the DOM table). */
export function gameOverRowView(row: GameOverPlayerRow): GameOverRowView {
  const who = row.isHuman
    ? hu.gameOver.human
    : [row.difficulty ? hu.setup.difficulties[row.difficulty] : '', row.personality ? hu.personalities[row.personality] : '']
        .filter((s) => s !== '')
        .join(' · ');
  return {
    swatch: hex(row.color),
    civ: hu.civs[row.civ],
    who,
    age: hu.gameOver.ageLabel(row.age),
    outcome: hu.gameOver.outcomes[row.outcome],
    outcomeId: row.outcome,
    isHuman: row.isHuman,
  };
}
