import { describe, expect, it } from 'vitest';
import v3Save from '../../save/migrations/fixtures/v3-m8.json';
import { SCHEMA_VERSION } from '../../save/schema';
import { SaveStorage } from '../../save/storage';
import { exportFileName, exportSlot } from './SaveExport';

function memoryStorage(entries: Record<string, string>) {
  return new SaveStorage({ getItem: async (k) => entries[k] ?? null, setItem: async (k, v) => void (entries[k] = v) });
}

describe('exportSlot', () => {
  const now = new Date(2026, 10, 1, 9, 30);

  it('names the file after the slot and the local date', () => {
    expect(exportFileName(2, now)).toBe('saecula-mentes-2-2026-11-01.json');
    expect(exportFileName('auto', now)).toBe('saecula-mentes-auto-2026-11-01.json');
  });

  it("downloads the slot's save at the current schema version", async () => {
    const files: Array<[string, string]> = [];
    const result = await exportSlot(memoryStorage({ 'save:3': JSON.stringify(v3Save) }), 3, (n, t) => files.push([n, t]), now);
    expect(result).toEqual({ ok: true, message: 'A mentés letöltése elindult' });
    expect(files).toHaveLength(1);
    expect(files[0]![0]).toBe('saecula-mentes-3-2026-11-01.json');
    expect(JSON.parse(files[0]![1]).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('an empty or corrupt slot downloads nothing and says why', async () => {
    const files: string[] = [];
    const storage = memoryStorage({ 'save:2': '{broken' });
    expect(await exportSlot(storage, 1, (n) => files.push(n), now)).toMatchObject({ ok: false });
    expect(await exportSlot(storage, 2, (n) => files.push(n), now)).toEqual({ ok: false, message: 'Sérült mentés — nem tölthető be' });
    expect(files).toEqual([]);
  });
});
