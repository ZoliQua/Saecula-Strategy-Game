import { describe, expect, it } from 'vitest';
import { resumeHeadlessMatch } from '../../ai/testing/headlessMatch';
import { parseSave } from '../parse';
import { SCHEMA_VERSION } from '../schema';
import { FIXED_DATE, MIN, STEP_MS } from '../savedMatch.testkit';
import v13Save from './fixtures/v13-m19.json';
import { migrate } from './index';
import { v13ToV14 } from './v13ToV14';

/* fixtures/v13-m19.json: a real M19 (schema v13) save (the default save sim after one minute), made before the bump. */

describe('v13 → v14 migration', () => {
  it('reshapes nothing: only the mission enum widened', () => {
    const data = { schemaVersion: 13, setup: { mission: 'age_of_wonders' }, entities: [], gameTimeMs: 5 };
    expect(v13ToV14(data)).toEqual(data);
    expect(migrate(data, 14)).toEqual({ ok: true, data: { ...data, schemaVersion: 14 } });
    expect(SCHEMA_VERSION).toBe(14);
  });

  it('the v13 fixture migrates unchanged and plays on', () => {
    expect(v13Save.schemaVersion).toBe(13);
    const parsed = parseSave(JSON.stringify(v13Save));
    if (!parsed.ok) throw new Error(`fixture did not parse: ${parsed.reason}`);
    expect(parsed.save).toEqual({ ...v13Save, schemaVersion: 14 });
    const match = resumeHeadlessMatch(parsed.save);
    match.run(MIN, STEP_MS);
    expect(parseSave(JSON.stringify(match.snapshot(FIXED_DATE))).ok).toBe(true);
  });
});
