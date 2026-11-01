import { describe, expect, it } from 'vitest';
import { SAVE_SHARE } from '../config/constants';
import { resumeHeadlessMatch } from '../ai/testing/headlessMatch';
import v3Save from './migrations/fixtures/v3-m8.json';
import { SCHEMA_VERSION } from './schema';
import { FIXED_DATE, STEP_MS, savableMatch } from './savedMatch.testkit';
import { exportSaveText, importSaveFile, type ImportSource } from './share';

const file = (text: string, size = text.length): ImportSource => ({ size, text: async () => text });

describe('save sharing', () => {
  it('export → import round-trips a save exactly, and the imported match plays on', async () => {
    const match = savableMatch();
    match.run(5_000, STEP_MS);
    const save = match.snapshot(FIXED_DATE);
    const result = await importSaveFile(file(exportSaveText(save)));
    if (!result.ok) throw new Error(result.reason);
    expect(result.save).toEqual(save);
    const resumed = resumeHeadlessMatch(result.save);
    resumed.run(1_000, STEP_MS);
    expect(resumed.snapshot(FIXED_DATE).gameTimeMs).toBe(save.gameTimeMs + 1_000);
  });

  it('an older save file is migrated to the current version', async () => {
    const result = await importSaveFile(file(JSON.stringify(v3Save)));
    expect(result.ok && result.save.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('refuses a file over the size limit before reading it', async () => {
    let read = false;
    const big: ImportSource = { size: SAVE_SHARE.maxBytes + 1, text: async () => ((read = true), '{}') };
    expect(await importSaveFile(big)).toEqual({ ok: false, reason: 'tooLarge' });
    expect(read).toBe(false);
    // A file whose reported size lies is caught on its length.
    expect(await importSaveFile(file('x'.repeat(11), 1), 10)).toEqual({ ok: false, reason: 'tooLarge' });
  });

  it('an unreadable file, junk, another JSON or a newer save each give a reason, never a throw', async () => {
    const broken: ImportSource = { size: 3, text: () => Promise.reject(new Error('io')) };
    expect(await importSaveFile(broken)).toEqual({ ok: false, reason: 'unreadable' });
    expect(await importSaveFile(file('not json'))).toEqual({ ok: false, reason: 'corrupt' });
    expect(await importSaveFile(file('{"v":1,"matches":[]}'))).toEqual({ ok: false, reason: 'corrupt' });
    expect(await importSaveFile(file(JSON.stringify({ ...v3Save, schemaVersion: SCHEMA_VERSION + 1 })))).toEqual({ ok: false, reason: 'newer' });
    expect(await importSaveFile(file(''))).toEqual({ ok: false, reason: 'corrupt' });
  });
});
