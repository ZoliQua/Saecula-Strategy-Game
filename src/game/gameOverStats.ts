import type { PersonalityId } from '../config/aiPersonality';
import type { AgeId, CivId } from '../types';
import type { Difficulty } from './GameSetupConfig';
import type { Player } from './Player';
import type { VictoryCause } from './VictoryChecker';

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
  /** On the human's team (M16); absent outside team matches and for the human and enemies. Display only, never stored. */
  ally?: true;
}

/**
 * Who the table names the winner, or null when nothing is decided among
 * the survivors: a human victory or a Wonder names its winner; a conquest
 * defeat of the human only when every player still standing is on one
 * team (VictoryChecker's winnerId is then just the first enemy standing):
 * that team's lowest-id standing player, never the human's own team. With
 * no allies that is "exactly one other player still stands".
 */
export function decidedWinner(
  state: { readonly kind: 'victory' | 'defeat'; readonly winnerId: number; readonly cause: VictoryCause },
  players: readonly Pick<Player, 'id' | 'defeated' | 'team' | 'isHuman'>[],
): number | null {
  if (state.kind === 'victory' || state.cause !== 'conquest') return state.winnerId;
  const standing = players.filter((p) => !p.defeated).sort((a, b) => a.id - b.id);
  const first = standing[0];
  // A defeat never crowns the human's own team (the human and the last enemy fell together, allies left).
  const humanTeam = players.find((p) => p.isHuman)?.team;
  if (first === undefined || first.team === humanTeam) return null;
  return standing.every((p) => p.team === first.team) ? first.id : null;
}

/**
 * The game-over player table, in player id order: `winnerId` won (null:
 * nobody yet), the defeated lost, the rest still stand. The human's allies
 * (M16) carry `ally`.
 */
export function gameOverRows(players: readonly Player[], winnerId: number | null, difficulty: Difficulty): GameOverPlayerRow[] {
  const human = players.find((p) => p.isHuman);
  const allied = (p: Player): boolean => human !== undefined && p.id !== human.id && p.team === human.team;
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
      ...(allied(p) ? { ally: true as const } : {}),
    }));
}
