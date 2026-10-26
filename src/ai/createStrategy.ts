import type { Difficulty } from '../game/GameSetupConfig';
import type { AIStrategy } from './AIPlayer';
import { EasyStrategy } from './strategies/EasyStrategy';
import { MediumStrategy } from './strategies/MediumStrategy';

/**
 * One fresh strategy instance per AI player (strategies keep state).
 * Hard is not implemented yet and plays like Medium.
 */
export function createStrategy(difficulty: Difficulty, rng: () => number = Math.random): AIStrategy {
  switch (difficulty) {
    case 'easy':
      return new EasyStrategy(rng);
    case 'medium':
    case 'hard':
      return new MediumStrategy(rng);
  }
}
