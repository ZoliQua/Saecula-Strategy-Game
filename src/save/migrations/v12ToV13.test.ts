import { describe, expect, it } from 'vitest';
import { resumeHeadlessMatch } from '../../ai/testing/headlessMatch';
import { parseSave } from '../parse';
import { SCHEMA_VERSION } from '../schema';
import { FIXED_DATE, MIN, STEP_MS } from '../savedMatch.testkit';
import v12Save from './fixtures/v12-m18.json';
import { migrate } from './index';
import { v12ToV13 } from './v12ToV13';

/* fixtures/v12-m18.json: a real M18 (schema v12) save (the default save sim after one minute), made before the bump. */

describe('v12 → v13 migration', () => {
  it('reshapes nothing: only the enums widened', () => {
    const data = { schemaVersion: 12, setup: { victory: 'all' }, entities: [], gameTimeMs: 5 };
    expect(v12ToV13(data)).toEqual(data);
    expect(migrate(data, 13)).toEqual({ ok: true, data: { ...data, schemaVersion: 13 } });
  });

  it('the v12 fixture migrates unchanged, with no king and no hill, and plays on', () => {
    expect(v12Save.schemaVersion).toBe(12);
    const parsed = parseSave(JSON.stringify(v12Save));
    if (!parsed.ok) throw new Error(`fixture did not parse: ${parsed.reason}`);
    expect(parsed.save).toEqual({ ...v12Save, schemaVersion: SCHEMA_VERSION });
    expect(parsed.save.entities.some((e) => e.components.hill || e.components.unit?.unitType === 'king')).toBe(false);
    const match = resumeHeadlessMatch(parsed.save);
    match.run(MIN, STEP_MS);
    expect(parseSave(JSON.stringify(match.snapshot(FIXED_DATE))).ok).toBe(true);
  });
});
