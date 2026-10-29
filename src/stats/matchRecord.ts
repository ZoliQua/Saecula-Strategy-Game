import { z } from 'zod';
import { PERSONALITIES, type PersonalityId } from '../config/aiPersonality';
import { CIV_IDS } from '../config/civs';
import { RECENT_MATCHES } from '../config/constants';
import type { EcsWorld } from '../ecs/world';
import { gameOverRows, type GameOverOutcome } from '../game/gameOverStats';
import { DIFFICULTIES, MAP_SIZE_IDS, mapTiles, type Difficulty, type GameSetupConfig, type MapSizeId } from '../game/GameSetupConfig';
import type { Player } from '../game/Player';
import type { VictoryCause } from '../game/VictoryChecker';
import { MAP_TEMPLATES, type MapTemplate } from '../map/generator';
import { GameSetupConfigSchema, PlayerMatchStatsSchema, TimelineSampleSchema } from '../save/schema';
import { ageId, civId, enumOf, int, num, type Assert, type Exact, type Loose } from '../save/schemaKit';
import type { AgeId, CivId } from '../types';
import type { PlayerMatchStats, TimelineSample } from './MatchStats';
import { scoreBreakdown, type ScoreBreakdown } from './score';

/** How the human's match ended; 'abandoned': quit from the pause. */
export type MatchOutcome = 'victory' | 'defeat' | 'abandoned';

/** One player of a logged match. */
export interface MatchRecordPlayer {
  id: number;
  isHuman: boolean;
  civ: CivId;
  color: number;
  /** The AI's difficulty; null for the human. */
  difficulty: Difficulty | null;
  /** The AI's personality; null for the human and AIs without one. */
  personality: PersonalityId | null;
  age: AgeId;
  result: GameOverOutcome;
  stats: PlayerMatchStats;
  score: ScoreBreakdown;
}

/** One finished or abandoned match in the local match log (M7 Decision 11). */
export interface MatchRecord {
  /** The record format. */
  v: 1;
  /** When the record was written (ISO); also its key. */
  createdAt: string;
  setup: GameSetupConfig;
  outcome: MatchOutcome;
  cause: VictoryCause | null;
  /** Game time at the end (a loaded match counts its saved time too). */
  durationMs: number;
  map: { template: MapTemplate; mapSize: MapSizeId; tiles: number };
  /** In player id order. */
  players: MatchRecordPlayer[];
  timeline: TimelineSample[];
}

const count = int.nonnegative();
const breakdown = z.object({ economy: count, military: count, buildings: count, age: count, total: count }).strict();

export const MatchRecordSchema = z
  .object({
    v: z.literal(1),
    createdAt: z.string().datetime(),
    setup: GameSetupConfigSchema,
    outcome: enumOf<MatchOutcome>(['victory', 'defeat', 'abandoned']),
    cause: z.union([enumOf<VictoryCause>(['conquest', 'wonder']), z.null()]),
    durationMs: num.nonnegative(),
    map: z.object({ template: enumOf(MAP_TEMPLATES), mapSize: enumOf(MAP_SIZE_IDS), tiles: int.positive() }).strict(),
    players: z.array(
      z
        .object({
          id: int.positive(),
          isHuman: z.boolean(),
          civ: civId,
          color: count,
          difficulty: z.union([enumOf(DIFFICULTIES), z.null()]),
          personality: z.union([enumOf(PERSONALITIES), z.null()]),
          age: ageId,
          result: enumOf<GameOverOutcome>(['winner', 'defeated', 'standing']),
          stats: PlayerMatchStatsSchema,
          score: breakdown,
        })
        .strict(),
    ),
    timeline: z.array(TimelineSampleSchema),
  })
  .strict();

export type MatchRecordSchemaCheck = Assert<Exact<z.infer<typeof MatchRecordSchema>, Loose<MatchRecord>>>;

/** How the match ended, as GameScene knows it. */
export type MatchEnd = { kind: 'victory' | 'defeat'; winnerId: number | null; cause: VictoryCause } | { kind: 'abandoned' };

export interface MatchRecordInput {
  createdAt: Date;
  setup: GameSetupConfig;
  players: readonly Player[];
  stats: { of(playerId: number): Readonly<PlayerMatchStats>; readonly timeline: readonly TimelineSample[] };
  world: EcsWorld;
  durationMs: number;
  end: MatchEnd;
}

/** The log record of the match as it stands now (deep copies; nothing live is kept). */
export function buildMatchRecord({ createdAt, setup, players, stats, world, durationMs, end }: MatchRecordInput): MatchRecord {
  const winnerId = end.kind === 'abandoned' ? null : end.winnerId;
  const rows = gameOverRows(players, winnerId, setup.difficulty);
  return {
    v: 1,
    createdAt: createdAt.toISOString(),
    setup: { ...setup },
    outcome: end.kind,
    cause: end.kind === 'abandoned' ? null : end.cause,
    durationMs: Math.max(0, durationMs),
    map: { template: setup.template, mapSize: setup.mapSize, tiles: mapTiles(setup) },
    players: rows.map((row) => {
      const s = stats.of(row.id);
      return {
        id: row.id,
        isHuman: row.isHuman,
        civ: row.civ,
        color: row.color,
        difficulty: row.difficulty,
        personality: row.personality,
        age: row.age,
        result: row.outcome,
        stats: { ...s, ageUpAtMs: [...s.ageUpAtMs] },
        score: scoreBreakdown(row, s, world),
      };
    }),
    timeline: stats.timeline.map((t) => ({ tMs: t.tMs, scores: [...t.scores], pops: [...t.pops] })),
  };
}

/** One group of matches (by the human's civ, or by difficulty). */
export interface MatchGroup<K extends string> {
  key: K;
  matches: number;
  wins: number;
  winRate: number;
}

/** What the statistics screen shows. */
export interface MatchSummary {
  matches: number;
  wins: number;
  defeats: number;
  abandoned: number;
  /** Wins over all matches (an abandoned match counts as not won); null without matches. */
  winRate: number | null;
  avgDurationMs: number | null;
  /** The human's best final score; null without matches. */
  bestScore: number | null;
  byCiv: MatchGroup<CivId>[];
  byDifficulty: MatchGroup<Difficulty>[];
  /** The newest RECENT_MATCHES records, newest first. */
  recent: MatchRecord[];
}

/** The human's final score in `r` (0 if the record has no human). */
export const humanScore = (r: MatchRecord): number => r.players.find((p) => p.isHuman)?.score.total ?? 0;

function groups<K extends string>(records: readonly MatchRecord[], order: readonly K[], keyOf: (r: MatchRecord) => K): MatchGroup<K>[] {
  return order
    .map((key) => {
      const mine = records.filter((r) => keyOf(r) === key);
      const wins = mine.filter((r) => r.outcome === 'victory').length;
      return { key, matches: mine.length, wins, winRate: mine.length ? wins / mine.length : 0 };
    })
    .filter((g) => g.matches > 0);
}

/** Totals, groups and the recent list of the match log. */
export function summarize(records: readonly MatchRecord[]): MatchSummary {
  const n = records.length;
  const wins = records.filter((r) => r.outcome === 'victory').length;
  const defeats = records.filter((r) => r.outcome === 'defeat').length;
  const newestFirst = [...records].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  return {
    matches: n,
    wins,
    defeats,
    abandoned: n - wins - defeats,
    winRate: n ? wins / n : null,
    avgDurationMs: n ? records.reduce((s, r) => s + r.durationMs, 0) / n : null,
    bestScore: n ? Math.max(...records.map(humanScore)) : null,
    byCiv: groups(records, CIV_IDS, (r) => r.setup.civ),
    byDifficulty: groups(records, DIFFICULTIES, (r) => r.setup.difficulty),
    recent: newestFirst.slice(0, RECENT_MATCHES),
  };
}
