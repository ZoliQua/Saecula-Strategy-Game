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

/** A record written at minute `minute` (one match per minute by default, ids sorting opposite to time), with `over` on top. */
function record(minute: number, over: Partial<MatchRecord> = {}): MatchRecord {
  const setup = defaultSetupConfig(3);
  return {
    v: 1,
    matchId: `m-${String(1000 - minute).padStart(4, '0')}`,
    createdAt: new Date(Date.UTC(2026, 9, 1, 0, minute)).toISOString(),
    setup,
    outcome: 'defeat',
    cause: 'conquest',
    durationMs: 1000 * minute,
    map: { template: setup.template, mapSize: setup.mapSize, tiles: 96 },
    players: [],
    timeline: [],
    ...over,
  };
}

describe('MatchLog', () => {
  it('writes a record under match:<matchId> and reads it back', async () => {
    const store = memoryStore();
    const log = new MatchLog(store);
    expect(await log.append(record(1))).toBe(true);
    expect([...store.data.keys()]).toEqual([matchKey(record(1).matchId)]);
    expect(matchKey(record(1).matchId)).toBe('match:m-0999');
    expect(await log.readAll()).toEqual({ ok: true, records: [record(1)], corrupt: 0 });
  });

  it('one match saved and resumed is one record: a later end overwrites the earlier one', async () => {
    const store = memoryStore();
    const log = new MatchLog(store);
    await log.append(record(1, { matchId: 'same', outcome: 'abandoned', cause: null, durationMs: 60_000 }));
    await log.append(record(9, { matchId: 'same', outcome: 'abandoned', cause: null, durationMs: 90_000 }));
    await log.append(record(20, { matchId: 'same', outcome: 'victory', durationMs: 300_000 }));
    const { records } = await log.readAll();
    expect(records.map((r) => [r.matchId, r.outcome, r.durationMs])).toEqual([['same', 'victory', 300_000]]);
  });

  it('two different matches are two records', async () => {
    const store = memoryStore();
    const log = new MatchLog(store);
    await log.append(record(1, { matchId: 'a' }));
    await log.append(record(1, { matchId: 'b' }));
    expect((await log.readAll()).records.map((r) => r.matchId)).toEqual(['a', 'b']);
  });

  it('a record of the dev build before match ids (key match:<createdAt>) still reads, its id from the key', async () => {
    const store = memoryStore();
    const old = record(4);
    const { matchId: _dropped, ...legacy } = old;
    store.data.set(`match:${old.createdAt}`, JSON.stringify(legacy));
    const { records, corrupt } = await new MatchLog(store).readAll();
    expect(corrupt).toBe(0);
    expect(records).toEqual([{ ...old, matchId: old.createdAt }]);
  });

  it('keeps at most the cap and drops the oldest by createdAt (not by key), oldest first on read', async () => {
    const store = memoryStore();
    const log = new MatchLog(store, 3);
    // record(m)'s ids sort opposite to time: key order would drop the newest.
    for (const m of [5, 1, 4, 2, 3]) await log.append(record(m));
    const { records } = await log.readAll();
    expect(records.map((r) => r.durationMs / 1000)).toEqual([3, 4, 5]);
    expect(store.data.size).toBe(3);
  });

  it('an unreadable record is trimmed before any readable one', async () => {
    const store = memoryStore();
    const log = new MatchLog(store, 2);
    store.data.set('match:zzz', '{broken');
    await log.append(record(1));
    await log.append(record(2));
    expect([...store.data.keys()].sort()).toEqual([matchKey(record(1).matchId), matchKey(record(2).matchId)].sort());
  });

  it('the default cap is 200', async () => {
    const store = memoryStore();
    const log = new MatchLog(store);
    for (let m = 0; m < 203; m++) await log.append(record(m));
    expect(store.data.size).toBe(200);
    expect(store.data.has(matchKey(record(2).matchId))).toBe(false);
    expect(store.data.has(matchKey(record(3).matchId))).toBe(true);
  });

  it('a corrupt record is skipped and counted; other keys are ignored', async () => {
    const store = memoryStore();
    const log = new MatchLog(store);
    await log.append(record(1));
    store.data.set('match:b', '{not json');
    store.data.set('match:c', JSON.stringify({ ...record(3), outcome: 'draw' }));
    store.data.set('match:d', 42);
    store.data.set('other', 'x');
    const result = await log.readAll();
    expect(result).toEqual({ ok: true, records: [record(1)], corrupt: 3 });
  });

  it('a record whose read rejects is counted as corrupt; the rest still load', async () => {
    const store = memoryStore();
    const log = new MatchLog(store);
    await log.append(record(1));
    await log.append(record(2));
    const bad = matchKey(record(2).matchId);
    const getItem = store.getItem;
    store.getItem = (key) => (key === bad ? Promise.reject(new Error('read failed')) : getItem(key));
    expect(await log.readAll()).toEqual({ ok: true, records: [record(1)], corrupt: 1 });
  });

  it('a missing or failing store reports unavailable and never throws', async () => {
    for (const log of [new MatchLog(null), new MatchLog(rejecting)]) {
      expect(await log.append(record(1))).toBe(false);
      expect(await log.readAll()).toEqual({ ok: false, records: [], corrupt: 0 });
    }
  });
});
