import { AI_COMMON } from '../config/aiBalance';
import type { Difficulty } from '../game/GameSetupConfig';
import type { Player } from '../game/Player';
import type { FogOfWarData } from '../map/FogOfWarData';
import { createStatefulRng } from '../map/random';
import { AIPlayer } from './AIPlayer';
import { aiRngSeed, createStrategy } from './createStrategy';
import type { AIPlayerState } from './strategyState';

export interface MatchAIOptions {
  /** The match seed: each AI's RNG is seeded from it and its player id (M6 decision 2). */
  readonly seed: number;
  readonly difficulty: Difficulty;
  /** Each AI's fog (a loaded save's, or a fresh one). */
  readonly fogOf: (playerId: number) => FogOfWarData;
  /** A loaded save's AI states by player id; none for a new match. */
  readonly states?: ReadonlyMap<number, AIPlayerState> | undefined;
}

/**
 * The AIs of a match, built the one way both the live game (SystemRunner)
 * and the headless twin (resumeHeadlessMatch) build them: a seeded
 * StatefulRng per AI, a strategy of the match difficulty with the
 * player's personality, the AI's fog and a fog-scan phase staggered
 * across the AIs; then restored from its saved state, if any. The
 * players' difficulty and personality must already be set. Throws on a
 * saved state of another strategy kind (the caller treats that as a
 * failed load).
 */
export function buildMatchAIs(players: readonly Player[], options: MatchAIOptions): AIPlayer[] {
  return players.map((p, i) => {
    const rng = createStatefulRng(aiRngSeed(options.seed, p.id));
    const strategy = createStrategy(options.difficulty, rng.next, p.personality);
    const fogPhaseMs = (AI_COMMON.fogScanMs * i) / players.length;
    const ai = new AIPlayer(p, strategy, { fog: options.fogOf(p.id), fogPhaseMs, rng });
    const state = options.states?.get(p.id);
    if (state) ai.restore(state);
    return ai;
  });
}
