import { AI_GATHER_HANDICAP } from '../config/aiBalance';
import type { Difficulty } from '../game/GameSetupConfig';
import type { Player } from '../game/Player';
import type { AIStrategy } from './AIPlayer';
import { EasyStrategy } from './strategies/EasyStrategy';
import { HardStrategy } from './strategies/HardStrategy';
import { MediumStrategy } from './strategies/MediumStrategy';

/** One fresh strategy instance per AI player (strategies keep state). */
export function createStrategy(difficulty: Difficulty, rng: () => number = Math.random): AIStrategy {
  switch (difficulty) {
    case 'easy':
      return new EasyStrategy(rng);
    case 'medium':
      return new MediumStrategy(rng);
    case 'hard':
      return new HardStrategy(rng);
  }
}

/**
 * Applies the difficulty's handicap to an AI player: the gather-rate
 * multiplier (Hard +20%, §10.3) that GatheringSystem reads through the
 * gather modifiers. The human never gets one.
 */
export function applyDifficulty(player: Player, difficulty: Difficulty): void {
  player.gatherHandicap = player.isHuman ? 1 : AI_GATHER_HANDICAP[difficulty];
}
