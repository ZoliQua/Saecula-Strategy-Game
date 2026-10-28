import { aiRngSeed, createStrategy } from '../ai/createStrategy';
import { pickPersonality } from '../ai/personality';
import { createHeadlessMatch, type HeadlessMatch } from '../ai/testing/headlessMatch';
import type { Difficulty } from '../game/GameSetupConfig';
import { createStatefulRng, type StatefulRng } from '../map/random';

/** The `createdAt` every save test snapshots with, so snapshots compare equal. */
export const FIXED_DATE = new Date('2026-10-28T12:00:00.000Z');
export const MIN = 60_000;
/** Step length of every save sim. */
export const STEP_MS = 100;

export interface SavedMatchOptions {
  readonly seed?: number;
  readonly size?: number;
  readonly aiCount?: number;
  readonly difficulty?: Difficulty;
}

/**
 * A headless match built the way a live game builds its AIs: each AI
 * has its seeded StatefulRng (aiRngSeed), its seeded personality and a
 * strategy of the match difficulty. Defaults: 64×64, seed 3, two Medium
 * AIs, Wonder victory on.
 */
export function savableMatch(options: SavedMatchOptions = {}): HeadlessMatch {
  const seed = options.seed ?? 3;
  const difficulty = options.difficulty ?? 'medium';
  const rngs = new Map<number, StatefulRng>();
  const rng = (id: number): StatefulRng => {
    let r = rngs.get(id);
    if (!r) rngs.set(id, (r = createStatefulRng(aiRngSeed(seed, id))));
    return r;
  };
  return createHeadlessMatch({
    seed,
    size: options.size ?? 64,
    aiCount: options.aiCount ?? 2,
    strategy: (id) => createStrategy(difficulty, rng(id).next, pickPersonality(seed, id)),
    personality: (id) => pickPersonality(seed, id),
    rng,
    difficulty: () => difficulty,
    wonderVictory: true,
  });
}
