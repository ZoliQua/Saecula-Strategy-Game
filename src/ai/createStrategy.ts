import type { Difficulty } from '../game/GameSetupConfig';
import type { AIStrategy } from './AIPlayer';
import { EasyStrategy } from './strategies/EasyStrategy';

/**
 * One fresh strategy instance per AI player (strategies keep state).
 * Medium / Hard are not implemented yet and play like Easy.
 */
export function createStrategy(_difficulty: Difficulty): AIStrategy {
  return new EasyStrategy();
}
