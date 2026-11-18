import { describe, expect, it } from 'vitest';
import { resumeHeadlessMatch } from '../../ai/testing/headlessMatch';
import { parseSave } from '../parse';
import { SCHEMA_VERSION } from '../schema';
import { FIXED_DATE, STEP_MS } from '../savedMatch.testkit';
import v7Save from './fixtures/v7-m13.json';
import { migrate } from './index';
import { v7ToV8 } from './v7ToV8';

/* fixtures/v7-m13.json: a real 0.8.0 (schema v7) save (the default save sim after one minute). */

describe('v7 → v8 migration', () => {
  it('returns the data unchanged (optional monkAvoid added to AI states)', () => {
    const data = { schemaVersion: 7, setup: { victory: 'conquest' } };
    expect(v7ToV8(data)).toEqual(data);
    expect(migrate(data, 8)).toEqual({ ok: true, data: { ...data, schemaVersion: 8 } });
  });

  it('the v7 fixture migrates, parses and plays on', () => {
    expect(v7Save.schemaVersion).toBe(7);
    const parsed = parseSave(JSON.stringify(v7Save));
    if (!parsed.ok) throw new Error(`fixture did not parse: ${parsed.reason}`);
    expect(parsed.save.schemaVersion).toBe(SCHEMA_VERSION);
    const match = resumeHeadlessMatch(parsed.save);
    match.run(2_000, STEP_MS);
    expect(match.snapshot(FIXED_DATE).schemaVersion).toBe(SCHEMA_VERSION);
  });
});
