import { AI_GATHER_HANDICAP, AI_HARD, AI_MASTER, AI_MEDIUM, type MediumTuning, type PersonalityId } from '../config/aiBalance';
import type { Difficulty } from '../game/GameSetupConfig';
import type { Player } from '../game/Player';
import type { AIStrategy } from './AIPlayer';
import { applyPersonality } from './personality';
import { EasyStrategy } from './strategies/EasyStrategy';
import { HardStrategy } from './strategies/HardStrategy';
import { MasterStrategy } from './strategies/MasterStrategy';
import { MediumStrategy } from './strategies/MediumStrategy';

/**
 * One fresh strategy instance per AI player (strategies keep state).
 * `personality` lays its overlay over the Medium, Hard and Mesteri
 * tables; Easy (the §10.1 random builder) ignores it.
 */
export function createStrategy(
  difficulty: Difficulty,
  rng: () => number = Math.random,
  personality?: PersonalityId,
): AIStrategy {
  const tuned = <T extends MediumTuning>(tune: T): T => (personality ? applyPersonality(tune, personality) : tune);
  switch (difficulty) {
    case 'easy':
      return new EasyStrategy(rng);
    case 'medium':
      return new MediumStrategy(rng, tuned(AI_MEDIUM));
    case 'hard':
      return new HardStrategy(rng, tuned(AI_HARD));
    case 'master':
      return new MasterStrategy(rng, tuned(AI_MASTER));
  }
}

/**
 * Seed of the live AI's own RNG (M6 decision 2): derived from the match
 * seed like the sims do, so a seed replays its AIs and the RNG state can be saved.
 */
export function aiRngSeed(matchSeed: number, playerId: number): number {
  return (matchSeed * 31 + playerId) >>> 0;
}

/** Whether an AI of `difficulty` gets a personality (Medium, Hard and Mesteri; never Easy). */
export function hasPersonality(difficulty: Difficulty): boolean {
  return difficulty !== 'easy';
}

/**
 * Applies the difficulty's handicap to an AI player: the gather-rate
 * multiplier (Hard and Mesteri +20%, §10.3) that GatheringSystem reads
 * through the gather modifiers. The human never gets one.
 */
export function applyDifficulty(player: Player, difficulty: Difficulty): void {
  player.gatherHandicap = player.isHuman ? 1 : AI_GATHER_HANDICAP[difficulty];
}
