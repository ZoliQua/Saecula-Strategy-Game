import { describe, expect, it } from 'vitest';
import { defaultSetupConfig } from '../game/GameSetupConfig';
import { matchKey, MatchLog, type MatchStore } from './matchLog';
import type { MatchRecord } from './matchRecord';

/** In-memory store with localforage's promise API. */
function memoryStore(): MatchStore & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    getItem: (key) => Promise.resolve(data.has(key) ? data.get(key) : null),
    setItem: (key, value) => {
      data.set(key, value);
      return Promise.resolve(value);
    },
    removeItem: (key) => {
      data.delete(key);
      return Promise.resolve();
    },
    keys: () => Promise.resolve([...data.keys()]),
  };
}

const rejecting: MatchStore = {
  getItem: () => Promise.reject(new Error('blocked')),
  setItem: () => Promise.reject(new Error('blocked')),
  removeItem: () => Promise.reject(new Error('blocked')),
  keys: () => Promise.reject(new Error('blocked')),
};

function record(minute: number): MatchRecord {
  const setup = defaultSetupConfig(3);
  return {
    v: 1,
    createdAt: new Date(Date.UTC(2026, 9, 1, 0, minute)).toISOString(),
    setup,
    outcome: 'defeat',
    cause: 'conquest',
    durationMs: 1000 * minute,
    map: { template: setup.template, mapSize: setup.mapSize, tiles: 96 },
    players: [],
    timeline: [],
  };
}

describe('MatchLog', () => {
  it('writes a record under match:<createdAt> and reads it back', async () => {
    const store = memoryStore();
    const log = new MatchLog(store);
    expect(await log.append(record(1))).toBe(true);
    expect([...store.data.keys()]).toEqual([matchKey(record(1).createdAt)]);
    expect(matchKey(record(1).createdAt)).toBe('match:2026-10-01T00:01:00.000Z');
    expect(await log.readAll()).toEqual({ ok: true, records: [record(1)], corrupt: 0 });
  });

  it('keeps at most the cap and drops the oldest', async () => {
    const store = memoryStore();
    const log = new MatchLog(store, 3);
    for (const m of [5, 1, 4, 2, 3]) await log.append(record(m));
    const { records } = await log.readAll();
    expect(records.map((r) => r.durationMs / 1000)).toEqual([3, 4, 5]);
    expect(store.data.size).toBe(3);
  });

  it('the default cap is 200', async () => {
    const store = memoryStore();
    const log = new MatchLog(store);
    for (let m = 0; m < 203; m++) await log.append(record(m));
    expect(store.data.size).toBe(200);
    expect(store.data.has(matchKey(record(2).createdAt))).toBe(false);
    expect(store.data.has(matchKey(record(3).createdAt))).toBe(true);
  });

  it('a corrupt record is skipped and counted; other keys are ignored', async () => {
    const store = memoryStore();
    const log = new MatchLog(store);
    await log.append(record(1));
    store.data.set('match:2026-10-01T00:02:00.000Z', '{not json');
    store.data.set('match:2026-10-01T00:03:00.000Z', JSON.stringify({ ...record(3), outcome: 'draw' }));
    store.data.set('match:2026-10-01T00:04:00.000Z', 42);
    store.data.set('other', 'x');
    const result = await log.readAll();
    expect(result).toEqual({ ok: true, records: [record(1)], corrupt: 3 });
  });

  it('a missing or failing store reports unavailable and never throws', async () => {
    for (const log of [new MatchLog(null), new MatchLog(rejecting)]) {
      expect(await log.append(record(1))).toBe(false);
      expect(await log.readAll()).toEqual({ ok: false, records: [], corrupt: 0 });
    }
  });
});
