import { MISSION_IDS, type MissionId } from '../campaign/missions';
import { GAME_SPEEDS, START_RESOURCES, TREATY, type StartResourcesId } from '../config/balance';
import { AVAILABLE_CIVS, DEFAULT_CIV } from '../config/civs';
import { MAP_TEMPLATES, type MapTemplate } from '../map/generator';
import { createRng } from '../map/random';
import { MODE_DEFAULTS } from './matchModes';
import type { CivId, Resources } from '../types';

export { AVAILABLE_CIVS, MODE_DEFAULTS };

export type MapSizeId = 'small' | 'medium' | 'large';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'master';

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
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard', 'master'];
/** Options that work today; the setup screen shows the rest as "coming soon". */
export const AVAILABLE_DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard', 'master'];
export const AVAILABLE_TEMPLATES: readonly MapTemplate[] = MAP_TEMPLATES;

/**
 * How a match can be won (CLAUDE.md §4.8): conquest is always on; a Wonder
 * held WONDER_HOLD_MS and / or the best score at TIME_VICTORY.limitMs are optional.
 */
export type VictoryMode = 'conquest' | 'conquest_wonder' | 'conquest_time' | 'all';
export const VICTORY_MODES: readonly VictoryMode[] = ['conquest', 'conquest_wonder', 'conquest_time', 'all'];

/** The mode lets a held Wonder win. */
export function hasWonderVictory(mode: VictoryMode): boolean {
  return mode === 'conquest_wonder' || mode === 'all';
}

/** The mode ends the match on score at the time limit. */
export function hasTimeVictory(mode: VictoryMode): boolean {
  return mode === 'conquest_time' || mode === 'all';
}

/** Treaty length in game minutes (0 = none, M16). */
export type TreatyMinutes = (typeof TREATY.minutes)[number];
/** Game-speed multiplier (M16). */
export type GameSpeed = (typeof GAME_SPEEDS)[number];
export type { StartResourcesId };
export const TREATY_MINUTES: readonly TreatyMinutes[] = TREATY.minutes;
export const START_RESOURCE_IDS: readonly StartResourcesId[] = ['normal', 'high', 'deathmatch'];
export const SPEED_CHOICES: readonly GameSpeed[] = GAME_SPEEDS;

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
  /** Victory conditions in play. */
  readonly victory: VictoryMode;
  /** A campaign mission (M13): the match is that mission's fixed setup with its objectives. */
  readonly mission?: MissionId | undefined;
  /** AIs on the human's team (players 2..1 + allies), 0..aiCount - 1 (M16; 0 = everyone is an enemy). */
  readonly allies: number;
  /** Treaty length in game minutes (M16; 0 = none). */
  readonly treatyMin: TreatyMinutes;
  /** Starting-resource preset for every player (M16; START_RESOURCES). */
  readonly startResources: StartResourcesId;
  /** Game-speed multiplier (M16). */
  readonly speed: GameSpeed;
}

export type AiCivChoice = 'mixed' | CivId;

/** The "Ellenfelek népe" options in setup order: a seeded mix first, then each playable civ. */
export const AI_CIV_CHOICES: readonly AiCivChoice[] = ['mixed', ...AVAILABLE_CIVS];

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
    victory: 'conquest_wonder',
    ...MODE_DEFAULTS,
  };
}

/** Allies clamped to 0..aiCount - 1 (at least one AI is always an enemy). */
export function clampAllies(allies: number, aiCount: number): number {
  if (!Number.isFinite(allies)) return 0;
  return Math.min(Math.max(0, aiCount - 1), Math.max(0, Math.round(allies)));
}

/** A fresh copy of the setup's starting resources: every player's stock, and the human's UI-store stock, at match start. */
export function startResourcesFor(setup: Pick<GameSetupConfig, 'startResources'>): Resources {
  return { ...(START_RESOURCES[setup.startResources] ?? START_RESOURCES.normal) };
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
 * template / difficulty / civ / victory / treaty / start-resource / speed
 * values fall back to the working ones (or defaults), numbers are clamped
 * (allies to 0..aiCount - 1, so a smaller AI count re-clamps them).
 */
export function withSetup(base: GameSetupConfig, change: Partial<GameSetupConfig>): GameSetupConfig {
  const next = { ...base, ...change };
  const aiCount = clampAiCount(next.aiCount);
  return {
    template: AVAILABLE_TEMPLATES.includes(next.template) ? next.template : 'meadow',
    mapSize: MAP_SIZE_IDS.includes(next.mapSize) ? next.mapSize : 'medium',
    aiCount,
    difficulty: AVAILABLE_DIFFICULTIES.includes(next.difficulty) ? next.difficulty : 'easy',
    civ: AVAILABLE_CIVS.includes(next.civ) ? next.civ : DEFAULT_CIV,
    aiCivs: next.aiCivs !== 'mixed' && AVAILABLE_CIVS.includes(next.aiCivs) ? next.aiCivs : 'mixed',
    seed: clampSeed(next.seed),
    victory: VICTORY_MODES.includes(next.victory) ? next.victory : 'conquest_wonder',
    allies: clampAllies(next.allies, aiCount),
    treatyMin: TREATY_MINUTES.includes(next.treatyMin) ? next.treatyMin : MODE_DEFAULTS.treatyMin,
    startResources: START_RESOURCE_IDS.includes(next.startResources) ? next.startResources : MODE_DEFAULTS.startResources,
    speed: SPEED_CHOICES.includes(next.speed) ? next.speed : MODE_DEFAULTS.speed,
    ...(next.mission !== undefined && (MISSION_IDS as readonly string[]).includes(next.mission) ? { mission: next.mission } : {}),
  };
}

/** A setup for the skirmish setup card: never a campaign mission (its tag would turn an edited skirmish into one). */
export function skirmishConfig(config: GameSetupConfig): GameSetupConfig {
  const { mission: _mission, ...rest } = config;
  return rest;
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
 * AIs (distinct civs while the pool lasts), fills the rest at random and
 * shuffles; `rng` makes it repeatable. `pool` defaults to the playable civs.
 */
export function assignCivs(config: GameSetupConfig, rng: () => number, pool: readonly CivId[] = AVAILABLE_CIVS): CivId[] {
  const n = config.aiCount;
  const fixed = config.aiCivs;
  if (fixed !== 'mixed') return Array.from({ length: n }, () => fixed);
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
