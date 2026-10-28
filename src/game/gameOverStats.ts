import type { PersonalityId } from '../config/aiPersonality';
import type { AgeId, CivId } from '../types';
import type { Difficulty } from './GameSetupConfig';
import type { Player } from './Player';

/** How a player ended the match. */
export type GameOverOutcome = 'winner' | 'defeated' | 'standing';

/** One row of the game-over player table. */
export interface GameOverPlayerRow {
  id: number;
  color: number;
  civ: CivId;
  isHuman: boolean;
  /** The AI's difficulty; null for the human. */
  difficulty: Difficulty | null;
  /** The AI's personality; null for the human and AIs without one (Easy). */
  personality: PersonalityId | null;
  age: AgeId;
  outcome: GameOverOutcome;
}

/** The game-over player table, in player id order: `winnerId` won, the defeated lost, the rest still stand. */
export function gameOverRows(players: readonly Player[], winnerId: number, difficulty: Difficulty): GameOverPlayerRow[] {
  return [...players]
    .sort((a, b) => a.id - b.id)
    .map((p) => ({
      id: p.id,
      color: p.color,
      civ: p.civ,
      isHuman: p.isHuman,
      difficulty: p.isHuman ? null : difficulty,
      personality: p.isHuman ? null : (p.personality ?? null),
      age: p.age,
      outcome: p.id === winnerId ? 'winner' : p.defeated ? 'defeated' : 'standing',
    }));
}
