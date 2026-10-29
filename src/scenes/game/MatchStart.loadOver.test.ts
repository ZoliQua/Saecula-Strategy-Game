import type Phaser from 'phaser';
import { beforeAll, describe, expect, it } from 'vitest';
import { defaultSetupConfig } from '../../game/GameSetupConfig';
import { FIXED_DATE, STEP_MS, savableMatch } from '../../save/savedMatch.testkit';
import type { SaveData } from '../../save/schema';
import { saveKey, SaveStorage, type KeyValueStore } from '../../save/storage';
import type { MatchEnd, MatchRecord } from '../../stats/matchRecord';
import { MatchRecorder } from './MatchRecorder';
import { prepareMatch, startFromSlot } from './MatchStart';

let save: SaveData;
beforeAll(() => {
  const match = savableMatch();
  match.run(2_000, STEP_MS);
  save = match.snapshot(FIXED_DATE);
});

function store(slots: Record<string, unknown>): KeyValueStore {
  return { getItem: (k) => Promise.resolve(slots[k] ?? null), setItem: () => Promise.resolve() };
}

/** A paused GameScene stand-in that records scene starts. */
function fakeScene() {
  const started: string[] = [];
  const scene = {
    scene: {
      isActive: () => false,
      isPaused: () => true,
      stop: () => undefined,
      start: (key: string) => started.push(key),
    },
  } as unknown as Phaser.Scene;
  return { scene, started };
}

/** The running match's recorder over a fake log; `played`: game time moved since its start. */
function recorder(played: boolean) {
  const written: MatchEnd['kind'][] = [];
  const build = (end: MatchEnd, durationMs: number): MatchRecord => {
    const setup = defaultSetupConfig(1);
    return { v: 1, matchId: 'm', createdAt: FIXED_DATE.toISOString(), setup, outcome: end.kind, cause: null, durationMs, map: { template: setup.template, mapSize: setup.mapSize, tiles: 96 }, players: [], timeline: [] };
  };
  const rec = new MatchRecorder({ append: (r) => (written.push(r.outcome), Promise.resolve(true)) }, build, 1000, () => (played ? 5000 : 1000));
  return { rec, written };
}

describe('a load from the pause over the running match (Decision 11)', () => {
  it('logs a played match as abandoned, once, before the new match starts', async () => {
    const { scene, started } = fakeScene();
    const { rec, written } = recorder(true);
    const ok = await startFromSlot(scene, new SaveStorage(store({ [saveKey(1)]: JSON.stringify(save) })), 1, () => {}, () => {
      expect(started).toEqual([]);
      rec.abandon();
    });
    expect(ok).toBe(true);
    expect(started).toEqual(['GameScene']);
    expect(written).toEqual(['abandoned']);
  });

  it('a match without any play writes nothing', async () => {
    const { scene } = fakeScene();
    const { rec, written } = recorder(false);
    await startFromSlot(scene, new SaveStorage(store({ [saveKey(1)]: JSON.stringify(save) })), 1, () => {}, () => rec.abandon());
    expect(written).toEqual([]);
  });

  it('a failed read (empty or corrupt slot) writes nothing and keeps the match', async () => {
    for (const slots of [{}, { [saveKey(1)]: '{broken' }]) {
      const { scene, started } = fakeScene();
      const { rec, written } = recorder(true);
      const errors: string[] = [];
      const ok = await startFromSlot(scene, new SaveStorage(store(slots)), 1, (m) => errors.push(m), () => rec.abandon());
      expect([ok, started, written, errors.length]).toEqual([false, [], [], 1]);
    }
  });
});

describe('the match id across a load', () => {
  it('a loaded match keeps the match id of its save (one match log record per match)', () => {
    const prepared = prepareMatch({ load: save });
    expect(prepared.ok).toBe(true);
    if (prepared.ok) expect(prepared.match.matchId).toBe(save.matchId);
  });
});
