import { beforeAll, describe, expect, it } from 'vitest';
import type { SaveData } from './schema';
import { FIXED_DATE, STEP_MS, savableMatch } from './savedMatch.testkit';
import { saveKey, SaveStorage, type KeyValueStore, type SlotId } from './storage';

/** A small real save (10 s of play). */
let save: SaveData;

beforeAll(() => {
  const match = savableMatch();
  match.run(10_000, STEP_MS);
  save = match.snapshot(FIXED_DATE);
});

/** In-memory store with localforage's promise API. */
function memoryStore(): KeyValueStore & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    getItem: (key) => Promise.resolve(data.has(key) ? data.get(key) : null),
    setItem: (key, value) => {
      data.set(key, value);
      return Promise.resolve(value);
    },
  };
}

/** A store whose every call rejects (IndexedDB blocked mid-session). */
const rejectingStore: KeyValueStore = {
  getItem: () => Promise.reject(new Error('blocked')),
  setItem: () => Promise.reject(new Error('blocked')),
};

const SLOTS: SlotId[] = [1, 2, 3, 4, 5, 'auto'];

describe('SaveStorage (Review Focus 2)', () => {
  it('slot keys are save:1 … save:5 and save:auto', () => {
    expect(SLOTS.map(saveKey)).toEqual(['save:1', 'save:2', 'save:3', 'save:4', 'save:5', 'save:auto']);
  });

  it('write then read returns the save', async () => {
    const store = memoryStore();
    const storage = new SaveStorage(store);
    expect(await storage.write(2, save)).toEqual({ ok: true });
    expect(typeof store.data.get('save:2')).toBe('string');
    expect(await storage.read(2)).toEqual({ ok: true, save });
    expect(await storage.read(1)).toEqual({ ok: false, reason: 'empty' });
  });

  it('list shows 5 slots + auto with meta for filled ones', async () => {
    const storage = new SaveStorage(memoryStore());
    await storage.write(3, save);
    await storage.write('auto', save);
    const rows = await storage.list();
    expect(rows.map((r) => r.slot)).toEqual(SLOTS);
    expect(rows.map((r) => r.state)).toEqual(['empty', 'empty', 'ok', 'empty', 'empty', 'ok']);
    expect(rows[2]).toEqual({ slot: 3, state: 'ok', meta: save.meta, createdAt: save.createdAt, gameTimeMs: save.gameTimeMs });
    expect(rows[0]).toEqual({ slot: 1, state: 'empty' });
  });

  it('corrupt string → corrupt in read and list, other slots still ok', async () => {
    const store = memoryStore();
    const storage = new SaveStorage(store);
    await storage.write(1, save);
    store.data.set('save:2', '{"schemaVersion":1,"truncat');
    store.data.set('save:4', 12345);
    expect(await storage.read(2)).toEqual({ ok: false, reason: 'corrupt' });
    expect(await storage.read(4)).toEqual({ ok: false, reason: 'corrupt' });
    const rows = await storage.list();
    expect(rows.map((r) => r.state)).toEqual(['ok', 'corrupt', 'empty', 'corrupt', 'empty', 'empty']);
    expect((await storage.read(1)).ok).toBe(true);
  });

  it('newer schema → newer', async () => {
    const store = memoryStore();
    const storage = new SaveStorage(store);
    store.data.set('save:5', JSON.stringify({ ...save, schemaVersion: 99 }));
    expect(await storage.read(5)).toEqual({ ok: false, reason: 'newer' });
    expect((await storage.list())[4]).toEqual({ slot: 5, state: 'newer' });
  });

  it('null store → unavailable for write, read and every list row', async () => {
    const storage = new SaveStorage(null);
    expect(await storage.write(1, save)).toEqual({ ok: false, reason: 'unavailable' });
    expect(await storage.read(1)).toEqual({ ok: false, reason: 'unavailable' });
    const rows = await storage.list();
    expect(rows).toEqual(SLOTS.map((slot) => ({ slot, state: 'unavailable' })));
  });

  it('rejecting getItem → unavailable, no throw', async () => {
    const storage = new SaveStorage(rejectingStore);
    await expect(storage.read('auto')).resolves.toEqual({ ok: false, reason: 'unavailable' });
    await expect(storage.write('auto', save)).resolves.toEqual({ ok: false, reason: 'unavailable' });
    const rows = await storage.list();
    expect(rows.every((r) => r.state === 'unavailable')).toBe(true);
  });

  it('a store that throws synchronously → unavailable, no throw', async () => {
    const throwing: KeyValueStore = {
      getItem: () => {
        throw new Error('sync');
      },
      setItem: () => {
        throw new Error('sync');
      },
    };
    const storage = new SaveStorage(throwing);
    await expect(storage.read(1)).resolves.toEqual({ ok: false, reason: 'unavailable' });
    await expect(storage.write(1, save)).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });
});
