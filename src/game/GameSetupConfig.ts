import { AVAILABLE_CIVS, DEFAULT_CIV } from '../config/civs';
import { MAP_TEMPLATES, type MapTemplate } from '../map/generator';
import { createRng } from '../map/random';
import type { CivId } from '../types';

export { AVAILABLE_CIVS };

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
export const AVAILABLE_DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];
export const AVAILABLE_TEMPLATES: readonly MapTemplate[] = MAP_TEMPLATES;

export const MIN_AI = 1;
export const MAX_AI = 5;
export const MAX_SEED = 999_999;

export interface GameSetupConfig {
  readonly template: MapTemplate;
  readonly mapSize: MapSizeId;
  readonly aiCount: number;
  readonly difficulty: Difficulty;
  /** The human's civ. */
  readonly civ: CivId;
  /** The AIs' civ: one for all, or 'mixed' (seeded mix of the available civs, see assignCivs). */
  readonly aiCivs: AiCivChoice;
  readonly seed: number;
}

export type AiCivChoice = 'mixed' | CivId;

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
    civ: DEFAULT_CIV,
    aiCivs: 'mixed',
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
    civ: AVAILABLE_CIVS.includes(next.civ) ? next.civ : DEFAULT_CIV,
    aiCivs: next.aiCivs !== 'mixed' && AVAILABLE_CIVS.includes(next.aiCivs) ? next.aiCivs : 'mixed',
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

/**
 * The civ of each AI (players 2..aiCount + 1, in order). 'mixed' deals
 * the available civs so each appears at least once when there are enough
 * AIs, fills the rest at random and shuffles; `rng` makes it repeatable.
 */
export function assignCivs(config: GameSetupConfig, rng: () => number): CivId[] {
  const n = config.aiCount;
  const fixed = config.aiCivs;
  if (fixed !== 'mixed') return Array.from({ length: n }, () => fixed);
  const pool = AVAILABLE_CIVS;
  const pick = (): CivId => pool[Math.floor(rng() * pool.length)] ?? DEFAULT_CIV;
  const civs: CivId[] = shuffle([...pool], rng).slice(0, n);
  while (civs.length < n) civs.push(pick());
  return shuffle(civs, rng);
}

/** Salt so the civ draw does not follow the map generator's sequence. */
const CIV_RNG_SALT = 0x5bd1e995;

/** The civs of a match from its config: the same seed always gives the same line-up. */
export function matchCivs(config: GameSetupConfig): { human: CivId; ais: CivId[] } {
  return { human: config.civ, ais: assignCivs(config, createRng(config.seed ^ CIV_RNG_SALT)) };
}

/** Each civ present in the match once (human's first): only these get art painted and kept. */
export function civsInPlay(config: GameSetupConfig): CivId[] {
  const { human, ais } = matchCivs(config);
  return [...new Set([human, ...ais])];
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j] as T, items[i] as T];
  }
  return items;
}
