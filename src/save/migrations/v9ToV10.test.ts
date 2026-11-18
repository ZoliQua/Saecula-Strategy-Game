import { describe, expect, it } from 'vitest';
import { resumeHeadlessMatch } from '../../ai/testing/headlessMatch';
import { parseSave } from '../parse';
import { SCHEMA_VERSION } from '../schema';
import { FIXED_DATE, MIN, STEP_MS } from '../savedMatch.testkit';
import v9Save from './fixtures/v9-092.json';
import { migrate } from './index';
import { v9ToV10 } from './v9ToV10';

/* fixtures/v9-092.json: a real 0.9.2 (schema v9) save (the default save sim after one minute). */

const MODES = { allies: 0, treatyMin: 0, startResources: 'normal', speed: 1 };

describe('v9 → v10 migration', () => {
  it('gives the setup the default modes and keeps everything else', () => {
    const data = { schemaVersion: 9, setup: { victory: 'conquest', seed: 4 }, gameTimeMs: 5 };
    expect(v9ToV10(data)).toEqual({ ...data, setup: { victory: 'conquest', seed: 4, ...MODES } });
    expect(data.setup).toEqual({ victory: 'conquest', seed: 4 });
    expect(migrate(data)).toEqual({ ok: true, data: { ...data, setup: { ...data.setup, ...MODES }, schemaVersion: 10 } });
    expect(SCHEMA_VERSION).toBe(10);
  });

  it('leaves a non-object setup for the schema to reject', () => {
    const data = { schemaVersion: 9, setup: 'x' };
    expect(v9ToV10(data)).toEqual(data);
    expect(parseSave(JSON.stringify(data)).ok).toBe(false);
  });

  it('the v9 fixture migrates with the default modes, parses and plays on', () => {
    expect(v9Save.schemaVersion).toBe(9);
    expect(v9Save.setup).not.toHaveProperty('allies');
    const parsed = parseSave(JSON.stringify(v9Save));
    if (!parsed.ok) throw new Error(`fixture did not parse: ${parsed.reason}`);
    expect(parsed.save.schemaVersion).toBe(10);
    expect(parsed.save.setup).toEqual({ ...v9Save.setup, ...MODES });
    const match = resumeHeadlessMatch(parsed.save);
    expect(match.setup).toMatchObject(MODES);
    match.run(MIN, STEP_MS);
    const again = match.snapshot(FIXED_DATE);
    expect(again.schemaVersion).toBe(10);
    expect(again.setup).toMatchObject(MODES);
    expect(parseSave(JSON.stringify(again)).ok).toBe(true);
  });

  it('a v10 save with as many allies as AIs, or without a mode field, is corrupt', () => {
    const parsed = parseSave(JSON.stringify(v9Save));
    if (!parsed.ok) throw new Error(parsed.reason);
    const save = parsed.save;
    expect(parseSave(JSON.stringify({ ...save, setup: { ...save.setup, allies: 1 } })).ok).toBe(true);
    expect(parseSave(JSON.stringify({ ...save, setup: { ...save.setup, allies: save.setup.aiCount } })).ok).toBe(false);
    const { speed: _s, ...noSpeed } = save.setup;
    expect(parseSave(JSON.stringify({ ...save, setup: noSpeed })).ok).toBe(false);
    expect(parseSave(JSON.stringify({ ...save, setup: { ...save.setup, treatyMin: 15 } })).ok).toBe(false);
    expect(parseSave(JSON.stringify({ ...save, setup: { ...save.setup, speed: 3 } })).ok).toBe(false);
  });
});
