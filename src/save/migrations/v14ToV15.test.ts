import { describe, expect, it } from 'vitest';
import { resumeHeadlessMatch } from '../../ai/testing/headlessMatch';
import { parseSave } from '../parse';
import { SCHEMA_VERSION } from '../schema';
import { FIXED_DATE, MIN, STEP_MS } from '../savedMatch.testkit';
import v14Save from './fixtures/v14-m20.json';
import { migrate } from './index';
import { v14ToV15 } from './v14ToV15';

/* fixtures/v14-m20.json: a real M20 (schema v14) save (the default save sim after one minute), made before the bump. */

describe('v14 → v15 migration', () => {
  it('reshapes nothing: only the civ and unit-type enums widened', () => {
    const data = { schemaVersion: 14, setup: { civ: 'finnish' }, entities: [], gameTimeMs: 5 };
    expect(v14ToV15(data)).toEqual(data);
    expect(migrate(data, 15)).toEqual({ ok: true, data: { ...data, schemaVersion: 15 } });
    expect(SCHEMA_VERSION).toBe(15);
  });

  it('the v14 fixture migrates unchanged and plays on', () => {
    expect(v14Save.schemaVersion).toBe(14);
    const parsed = parseSave(JSON.stringify(v14Save));
    if (!parsed.ok) throw new Error(`fixture did not parse: ${parsed.reason}`);
    expect(parsed.save).toEqual({ ...v14Save, schemaVersion: SCHEMA_VERSION });
    const match = resumeHeadlessMatch(parsed.save);
    match.run(MIN, STEP_MS);
    expect(parseSave(JSON.stringify(match.snapshot(FIXED_DATE))).ok).toBe(true);
  });
});
