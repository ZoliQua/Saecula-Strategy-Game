import { describe, expect, it, vi } from 'vitest';
import { defaultSetupConfig } from '../../game/GameSetupConfig';
import { MatchLog, type MatchStore } from '../../stats/matchLog';
import type { MatchEnd, MatchRecord } from '../../stats/matchRecord';
import { MatchRecorder } from './MatchRecorder';

/** A fake record of match `matchId`, ended by `end` at `durationMs`, written at `at`. */
function fakeRecord(matchId: string, end: MatchEnd, durationMs: number, at = new Date(0)): MatchRecord {
  const setup = defaultSetupConfig(1);
  return {
    v: 1,
    matchId,
    createdAt: at.toISOString(),
    setup,
    outcome: end.kind,
    cause: end.kind === 'abandoned' ? null : end.cause,
    durationMs,
    map: { template: setup.template, mapSize: setup.mapSize, tiles: 96 },
    players: [],
    timeline: [],
  };
}

/** An in-memory localforage stand-in. */
function memoryStore(): MatchStore {
  const data = new Map<string, unknown>();
  return {
    getItem: (k) => Promise.resolve(data.get(k) ?? null),
    setItem: (k, v) => (data.set(k, v), Promise.resolve(v)),
    removeItem: (k) => (data.delete(k), Promise.resolve()),
    keys: () => Promise.resolve([...data.keys()]),
  };
}

/** A recorder over a fake log: the clock is `t.ms`, and each written record names its end. */
function setup(startMs: number) {
  const t = { ms: startMs };
  const written: MatchRecord[] = [];
  const log = {
    append: (r: MatchRecord) => {
      written.push(r);
      return Promise.resolve(true);
    },
  };
  const build = (end: MatchEnd, durationMs: number): MatchRecord => fakeRecord('m', end, durationMs);
  const recorder = new MatchRecorder(log, build, startMs, () => t.ms);
  return { t, written, recorder };
}

describe('MatchRecorder (Decision 11)', () => {
  it('writes the game-over record once, even when leaving from the pause follows', () => {
    const { t, written, recorder } = setup(0);
    t.ms = 90_000;
    recorder.gameOver({ kind: 'victory', winnerId: 1, cause: 'conquest' });
    recorder.gameOver({ kind: 'victory', winnerId: 1, cause: 'conquest' });
    recorder.abandon();
    expect(written.map((r) => [r.outcome, r.durationMs])).toEqual([['victory', 90_000]]);
  });

  it('leaving from the pause is an abandoned match', () => {
    const { t, written, recorder } = setup(0);
    t.ms = 5_000;
    recorder.abandon();
    recorder.abandon();
    expect(written.map((r) => r.outcome)).toEqual(['abandoned']);
  });

  it('a loaded match left without any play writes nothing', () => {
    const { written, recorder } = setup(600_000);
    recorder.abandon();
    expect(written).toEqual([]);
  });

  it('a loaded match played on is recorded with its whole game time', () => {
    const { t, written, recorder } = setup(600_000);
    t.ms = 600_016;
    recorder.abandon();
    expect(written.map((r) => r.durationMs)).toEqual([600_016]);
  });

  it('a match saved, abandoned, resumed and won is one victory record with its whole game time', async () => {
    const log = new MatchLog(memoryStore());
    const session = (matchId: string, startMs: number, endMs: number, at: number) =>
      new MatchRecorder(log, (end, d) => fakeRecord(matchId, end, d, new Date(at)), startMs, () => endMs);
    // Played to 5:00, saved, quit from the pause.
    session('match-a', 0, 300_000, 1).abandon();
    await Promise.resolve();
    // The save loaded twice: once left again from the pause (another load over it), once played to a win.
    session('match-a', 300_000, 360_000, 2).abandon();
    session('match-a', 300_000, 900_000, 3).gameOver({ kind: 'victory', winnerId: 1, cause: 'conquest' });
    // A different match is its own record.
    session('match-b', 0, 60_000, 4).abandon();
    await new Promise((r) => setTimeout(r, 0));
    const { records } = await log.readAll();
    expect(records.map((r) => [r.matchId, r.outcome, r.durationMs])).toEqual([
      ['match-a', 'victory', 900_000],
      ['match-b', 'abandoned', 60_000],
    ]);
  });

  it('a record that cannot be built is dropped quietly', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const recorder = new MatchRecorder({ append: () => Promise.resolve(true) }, () => {
      throw new Error('boom');
    }, 0, () => 10);
    expect(() => recorder.abandon()).not.toThrow();
    warn.mockRestore();
  });
});
