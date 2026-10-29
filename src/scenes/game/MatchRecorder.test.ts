import { describe, expect, it, vi } from 'vitest';
import { defaultSetupConfig } from '../../game/GameSetupConfig';
import type { MatchEnd, MatchRecord } from '../../stats/matchRecord';
import { MatchRecorder } from './MatchRecorder';

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
  const build = (end: MatchEnd, durationMs: number): MatchRecord => {
    const setup = defaultSetupConfig(1);
    return {
      v: 1,
      createdAt: new Date(0).toISOString(),
      setup,
      outcome: end.kind,
      cause: end.kind === 'abandoned' ? null : end.cause,
      durationMs,
      map: { template: setup.template, mapSize: setup.mapSize, tiles: 96 },
      players: [],
      timeline: [],
    };
  };
  const recorder = new MatchRecorder(log, build, startMs, () => t.ms);
  return { t, written, recorder };
}

describe('MatchRecorder (Decision 11)', () => {
  it('writes the game-over record once, even when a quit follows', () => {
    const { t, written, recorder } = setup(0);
    t.ms = 90_000;
    recorder.gameOver({ kind: 'victory', winnerId: 1, cause: 'conquest' });
    recorder.gameOver({ kind: 'victory', winnerId: 1, cause: 'conquest' });
    recorder.quit();
    expect(written.map((r) => [r.outcome, r.durationMs])).toEqual([['victory', 90_000]]);
  });

  it('a quit from the pause is an abandoned match', () => {
    const { t, written, recorder } = setup(0);
    t.ms = 5_000;
    recorder.quit();
    recorder.quit();
    expect(written.map((r) => r.outcome)).toEqual(['abandoned']);
  });

  it('a loaded match left without any play writes nothing', () => {
    const { written, recorder } = setup(600_000);
    recorder.quit();
    expect(written).toEqual([]);
  });

  it('a loaded match played on is recorded with its whole game time', () => {
    const { t, written, recorder } = setup(600_000);
    t.ms = 600_016;
    recorder.quit();
    expect(written.map((r) => r.durationMs)).toEqual([600_016]);
  });

  it('a record that cannot be built is dropped quietly', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const recorder = new MatchRecorder({ append: () => Promise.resolve(true) }, () => {
      throw new Error('boom');
    }, 0, () => 10);
    expect(() => recorder.quit()).not.toThrow();
    warn.mockRestore();
  });
});
