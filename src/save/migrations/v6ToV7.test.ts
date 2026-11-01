import { describe, expect, it } from 'vitest';
import { resumeHeadlessMatch } from '../../ai/testing/headlessMatch';
import { restoreMatch } from '../deserializer';
import { parseSave } from '../parse';
import { SCHEMA_VERSION } from '../schema';
import { FIXED_DATE, STEP_MS, savableMatch } from '../savedMatch.testkit';
import v6Save from './fixtures/v6-m12.json';
import { migrate } from './index';
import { v6ToV7 } from './v6ToV7';

/* fixtures/v6-m12.json: a real M12 (schema v6) save (the default save sim after one minute, wheelbarrow researched). */

describe('v6 → v7 migration', () => {
  it('returns the data unchanged (optional mission and campaign fields added)', () => {
    const data = { schemaVersion: 6, setup: { victory: 'conquest' } };
    expect(v6ToV7(data)).toEqual(data);
    expect(migrate(data)).toEqual({ ok: true, data: { ...data, schemaVersion: 7 } });
    expect(SCHEMA_VERSION).toBe(7);
  });

  it('the v6 fixture migrates, parses (no mission) and plays on', () => {
    expect(v6Save.schemaVersion).toBe(6);
    const parsed = parseSave(JSON.stringify(v6Save));
    if (!parsed.ok) throw new Error(`fixture did not parse: ${parsed.reason}`);
    expect(parsed.save.schemaVersion).toBe(7);
    expect(parsed.save.setup.mission).toBeUndefined();
    expect(parsed.save.campaign).toBeUndefined();
    const match = resumeHeadlessMatch(parsed.save);
    match.run(2_000, STEP_MS);
    expect(match.snapshot(FIXED_DATE).schemaVersion).toBe(7);
  });

  it('a mission save keeps its mission and done objectives through JSON and a restore', () => {
    const match = savableMatch();
    match.run(5_000, STEP_MS);
    const s = { ...match.snapshot(FIXED_DATE), campaign: { done: [0, 2] } };
    const withMission = { ...s, setup: { ...s.setup, mission: 'first_monastery' as const } };
    const parsed = parseSave(JSON.stringify(withMission));
    if (!parsed.ok) throw new Error(parsed.reason);
    expect(parsed.save).toEqual(withMission);
    const restored = restoreMatch(parsed.save);
    expect(restored.setup.mission).toBe('first_monastery');
    expect(restored.campaign).toEqual({ done: [0, 2] });
    // An unknown mission id is a corrupt save.
    expect(parseSave(JSON.stringify({ ...withMission, setup: { ...withMission.setup, mission: 'nope' } }))).toEqual({ ok: false, reason: 'corrupt' });
  });
});
