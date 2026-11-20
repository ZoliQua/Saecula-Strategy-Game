import type { GameOverPlayerRow } from '../../game/gameOverStats';
import type { VictoryCause } from '../../game/VictoryChecker';
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
  /** The ally chip's text (M16) on the human's allies; absent otherwise. */
  readonly ally?: string;
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
    ...(row.ally ? { ally: hu.gameOver.ally } : {}),
  };
}

/**
 * The card's body line: a mission's closing text, else the cause's line for
 * the outcome, in its team wording (M16) when the match has teams. A mission
 * never has teams, so it keeps its free-for-all line.
 */
export function gameOverBody(info: { victory: boolean; cause: VictoryCause; teams?: boolean | undefined; missionText?: string | undefined }): string {
  if (info.missionText !== undefined) return info.missionText;
  const outcome = info.victory ? 'victory' : 'defeat';
  if (info.teams === true && info.cause !== 'mission') return hu.gameOver.teamBodies[info.cause][outcome];
  return hu.gameOver.bodies[info.cause][outcome];
}
