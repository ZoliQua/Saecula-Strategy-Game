import { describe, expect, it } from 'vitest';
import { resumeHeadlessMatch } from '../../ai/testing/headlessMatch';
import { parseSave } from '../parse';
import { SCHEMA_VERSION } from '../schema';
import { FIXED_DATE, STEP_MS, savableMatch } from '../savedMatch.testkit';
import v5Save from './fixtures/v5-m11.json';
import { migrate } from './index';
import { v5ToV6 } from './v5ToV6';

/* fixtures/v5-m11.json: a real M11 (schema v5) save (the default save sim after one minute, plus a monk). */

describe('v5 → v6 migration', () => {
  it('returns the data unchanged (the technology enum only widened)', () => {
    const data = { schemaVersion: 5, players: [{ researched: ['feudalism'] }] };
    expect(v5ToV6(data)).toEqual(data);
    expect(migrate(data, 6)).toEqual({ ok: true, data: { ...data, schemaVersion: 6 } });
  });

  it('the v5 fixture migrates, parses and plays on', () => {
    expect(v5Save.schemaVersion).toBe(5);
    const parsed = parseSave(JSON.stringify(v5Save));
    if (!parsed.ok) throw new Error(`fixture did not parse: ${parsed.reason}`);
    expect(parsed.save.schemaVersion).toBe(SCHEMA_VERSION);
    const match = resumeHeadlessMatch(parsed.save);
    match.run(2_000, STEP_MS);
    expect(match.snapshot(FIXED_DATE).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('a save holding the new technologies round-trips exactly', () => {
    const match = savableMatch();
    match.run(5_000, STEP_MS);
    for (const t of ['wheelbarrow', 'chemistry', 'illumination'] as const) match.players.get(1)!.researched.add(t);
    const s = match.snapshot(FIXED_DATE);
    const parsed = parseSave(JSON.stringify(s));
    if (!parsed.ok) throw new Error(parsed.reason);
    expect(parsed.save).toEqual(s);
    expect(resumeHeadlessMatch(parsed.save).snapshot(FIXED_DATE)).toEqual(s);
  });
});
