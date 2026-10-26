import type { MapTemplate } from '../map/generator';
import type { CivId } from '../types';

export type MapSizeId = 'small' | 'medium' | 'large';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface MapSizeSpec {
  /** Tiles per side (CLAUDE.md §4.7). */
  readonly tiles: number;
  /** Largest AI count the size is recommended for (players - 1). */
  readonly recommendedAi: number;
}

export const MAP_SIZES: Readonly<Record<MapSizeId, MapSizeSpec>> = {
  small: { tiles: 64, recommendedAi: 2 },
  medium: { tiles: 96, recommendedAi: 3 },
  large: { tiles: 128, recommendedAi: 5 },
};
export const MAP_SIZE_IDS: readonly MapSizeId[] = ['small', 'medium', 'large'];
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];
/** Options that work today; the setup screen shows the rest as "coming soon". */
export const AVAILABLE_DIFFICULTIES: readonly Difficulty[] = ['easy'];
export const AVAILABLE_TEMPLATES: readonly MapTemplate[] = ['meadow'];
export const AVAILABLE_CIVS: readonly CivId[] = ['hungarian'];

export const MIN_AI = 1;
export const MAX_AI = 5;
export const MAX_SEED = 999_999;

export interface GameSetupConfig {
  readonly template: MapTemplate;
  readonly mapSize: MapSizeId;
  readonly aiCount: number;
  readonly difficulty: Difficulty;
  readonly civ: CivId;
  readonly seed: number;
}

/** A fresh random seed (injectable rng for tests). */
export function randomSeed(rng: () => number = Math.random): number {
  return 1 + Math.floor(rng() * MAX_SEED);
}

export function defaultSetupConfig(seed: number = randomSeed()): GameSetupConfig {
  return {
    template: 'meadow',
    mapSize: 'medium',
    aiCount: 3,
    difficulty: 'easy',
    civ: 'hungarian',
    seed: clampSeed(seed),
  };
}

export function clampSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 1;
  return Math.min(MAX_SEED, Math.max(1, Math.floor(seed)));
}

export function clampAiCount(count: number): number {
  if (!Number.isFinite(count)) return MIN_AI;
  return Math.min(MAX_AI, Math.max(MIN_AI, Math.round(count)));
}

/**
 * Applies a partial change and returns a valid config: unsupported
 * template / difficulty / civ values fall back to the working ones,
 * numbers are clamped.
 */
export function withSetup(base: GameSetupConfig, change: Partial<GameSetupConfig>): GameSetupConfig {
  const next = { ...base, ...change };
  return {
    template: AVAILABLE_TEMPLATES.includes(next.template) ? next.template : 'meadow',
    mapSize: MAP_SIZE_IDS.includes(next.mapSize) ? next.mapSize : 'medium',
    aiCount: clampAiCount(next.aiCount),
    difficulty: AVAILABLE_DIFFICULTIES.includes(next.difficulty) ? next.difficulty : 'easy',
    civ: AVAILABLE_CIVS.includes(next.civ) ? next.civ : 'hungarian',
    seed: clampSeed(next.seed),
  };
}

export function mapTiles(config: GameSetupConfig): number {
  return MAP_SIZES[config.mapSize].tiles;
}

/** Total players, human included. */
export function playerCount(config: GameSetupConfig): number {
  return config.aiCount + 1;
}

/** True when the AI count is above what the map size is recommended for. */
export function exceedsRecommendedAi(config: GameSetupConfig): boolean {
  return config.aiCount > MAP_SIZES[config.mapSize].recommendedAi;
}
