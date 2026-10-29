import { describe, expect, it } from 'vitest';
import { createBuilding } from '../ecs/archetypes/building';
import { createEcsWorld } from '../ecs/world';
import { defaultSetupConfig, withSetup } from '../game/GameSetupConfig';
import { createPlayers } from '../game/PlayerManager';
import { MapData } from '../map/MapData';
import { MatchStats } from './MatchStats';
import { buildMatchRecord, MatchRecordSchema, summarize, type MatchRecord } from './matchRecord';

const AT = new Date('2026-10-29T12:00:00.000Z');

/** A two-AI match: the human (hungarian) at age 2 with a standing house, the AIs boomer / turtle. */
function fixture() {
  const world = createEcsWorld();
  const map = new MapData(40, 40);
  const players = createPlayers('hungarian', ['english', 'german']);
  players.get(1)!.age = 2;
  players.get(2)!.personality = 'boomer';
  players.get(3)!.personality = 'turtle';
  players.get(3)!.defeated = true;
  createBuilding(world, { type: 'house', origin: { tx: 4, ty: 4 }, playerId: 1, mapData: map });
  const stats = new MatchStats(world, players);
  stats.restore({
    players: {
      '1': { gathered: 1234, killValue: 510, unitsTrained: 9, unitsLost: 2, buildingsBuilt: 4, buildingsLost: 1, ageUpAtMs: [400_000] },
      '2': { gathered: 800, killValue: 0, unitsTrained: 5, unitsLost: 6, buildingsBuilt: 2, buildingsLost: 3, ageUpAtMs: [] },
      '3': { gathered: 10, killValue: 0, unitsTrained: 0, unitsLost: 3, buildingsBuilt: 0, buildingsLost: 2, ageUpAtMs: [] },
    },
    timeline: [{ tMs: 60_000, scores: [5, 4, 1], pops: [5, 5, 4] }],
  });
  const setup = withSetup(defaultSetupConfig(42), { aiCount: 2, difficulty: 'hard', mapSize: 'small', template: 'islands' });
  return { world, players, stats, setup };
}

/** A minimal valid record for the summary tests. */
function rec(over: { at: string; outcome: MatchRecord['outcome']; civ?: MatchRecord['setup']['civ']; difficulty?: MatchRecord['setup']['difficulty']; durationMs?: number; score?: number }): MatchRecord {
  const setup = withSetup(defaultSetupConfig(7), { civ: over.civ ?? 'hungarian', difficulty: over.difficulty ?? 'easy', aiCount: 1 });
  const zero = { gathered: 0, killValue: 0, unitsTrained: 0, unitsLost: 0, buildingsBuilt: 0, buildingsLost: 0, ageUpAtMs: [] };
  const total = over.score ?? 0;
  return {
    v: 1,
    createdAt: over.at,
    setup,
    outcome: over.outcome,
    cause: over.outcome === 'abandoned' ? null : 'conquest',
    durationMs: over.durationMs ?? 60_000,
    map: { template: setup.template, mapSize: setup.mapSize, tiles: 96 },
    players: [
      { id: 1, isHuman: true, civ: setup.civ, color: 0x4a8ad0, difficulty: null, personality: null, age: 1, result: over.outcome === 'victory' ? 'winner' : 'standing', stats: zero, score: { economy: total, military: 0, buildings: 0, age: 0, total } },
      { id: 2, isHuman: false, civ: 'english', color: 0xd04a4a, difficulty: setup.difficulty, personality: null, age: 1, result: 'standing', stats: zero, score: { economy: 0, military: 0, buildings: 0, age: 0, total: 0 } },
    ],
    timeline: [],
  };
}

describe('buildMatchRecord', () => {
  it('records the setup, players, final stats, score breakdown and timeline of a decided match', () => {
    const { world, players, stats, setup } = fixture();
    const r = buildMatchRecord({ createdAt: AT, setup, players: players.all(), stats, world, durationMs: 754_321, end: { kind: 'victory', winnerId: 1, cause: 'conquest' } });
    expect(r).toMatchObject({
      v: 1,
      createdAt: '2026-10-29T12:00:00.000Z',
      outcome: 'victory',
      cause: 'conquest',
      durationMs: 754_321,
      map: { template: 'islands', mapSize: 'small', tiles: 64 },
      setup: { seed: 42, difficulty: 'hard', victory: 'conquest_wonder', civ: 'hungarian' },
    });
    expect(r.players.map((p) => [p.id, p.civ, p.difficulty, p.personality, p.result])).toEqual([
      [1, 'hungarian', null, null, 'winner'],
      [2, 'english', 'hard', 'boomer', 'standing'],
      [3, 'german', 'hard', 'turtle', 'defeated'],
    ]);
    // 1234 / 10 = 123, 510 / 10 = 51, a house (30 wood) / 10 = 3, age 2 = 300.
    expect(r.players[0]!.score).toEqual({ economy: 123, military: 51, buildings: 3, age: 300, total: 477 });
    expect(r.players[0]!.stats).toMatchObject({ unitsTrained: 9, buildingsLost: 1, ageUpAtMs: [400_000] });
    expect(r.timeline).toEqual([{ tMs: 60_000, scores: [5, 4, 1], pops: [5, 5, 4] }]);
    expect(MatchRecordSchema.safeParse(JSON.parse(JSON.stringify(r))).success).toBe(true);
  });

  it('an abandoned match has no cause and no winner', () => {
    const { world, players, stats, setup } = fixture();
    const r = buildMatchRecord({ createdAt: AT, setup, players: players.all(), stats, world, durationMs: 1000, end: { kind: 'abandoned' } });
    expect(r.outcome).toBe('abandoned');
    expect(r.cause).toBeNull();
    expect(r.players.map((p) => p.result)).toEqual(['standing', 'standing', 'defeated']);
  });

  it('a defeat records the decided winner', () => {
    const { world, players, stats, setup } = fixture();
    const r = buildMatchRecord({ createdAt: AT, setup, players: players.all(), stats, world, durationMs: 1000, end: { kind: 'defeat', winnerId: 2, cause: 'wonder' } });
    expect([r.outcome, r.cause, r.players[1]!.result]).toEqual(['defeat', 'wonder', 'winner']);
  });
});

describe('summarize', () => {
  it('is empty without records', () => {
    expect(summarize([])).toMatchObject({ matches: 0, winRate: null, avgDurationMs: null, bestScore: null, byCiv: [], byDifficulty: [], recent: [] });
  });

  it('counts the win rate over every match, the average length, the best score and the groups', () => {
    const records = [
      rec({ at: '2026-10-01T10:00:00.000Z', outcome: 'victory', civ: 'english', difficulty: 'easy', durationMs: 600_000, score: 900 }),
      rec({ at: '2026-10-02T10:00:00.000Z', outcome: 'defeat', civ: 'english', difficulty: 'hard', durationMs: 300_000, score: 400 }),
      rec({ at: '2026-10-03T10:00:00.000Z', outcome: 'victory', civ: 'hungarian', difficulty: 'easy', durationMs: 900_000, score: 1500 }),
      rec({ at: '2026-10-04T10:00:00.000Z', outcome: 'abandoned', civ: 'hungarian', difficulty: 'hard', durationMs: 200_000, score: 50 }),
    ];
    const s = summarize(records);
    expect(s).toMatchObject({ matches: 4, wins: 2, defeats: 1, abandoned: 1, winRate: 0.5, avgDurationMs: 500_000, bestScore: 1500 });
    // Groups in the game's civ and difficulty order.
    expect(s.byCiv).toEqual([
      { key: 'hungarian', matches: 2, wins: 1, winRate: 0.5 },
      { key: 'english', matches: 2, wins: 1, winRate: 0.5 },
    ]);
    expect(s.byDifficulty).toEqual([
      { key: 'easy', matches: 2, wins: 2, winRate: 1 },
      { key: 'hard', matches: 2, wins: 0, winRate: 0 },
    ]);
    expect(s.recent.map((r) => r.createdAt.slice(0, 10))).toEqual(['2026-10-04', '2026-10-03', '2026-10-02', '2026-10-01']);
  });

  it('lists only the newest RECENT_MATCHES', () => {
    const records = Array.from({ length: 60 }, (_, i) => rec({ at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(), outcome: 'defeat' }));
    const s = summarize(records);
    expect(s.recent).toHaveLength(50);
    expect(s.recent[0]!.createdAt).toBe(records[59]!.createdAt);
    expect(s.matches).toBe(60);
  });
});
