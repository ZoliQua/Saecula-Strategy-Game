import { describe, expect, it } from 'vitest';
import { resumeHeadlessMatch } from '../../ai/testing/headlessMatch';
import { VICTORY_MODES } from '../../game/GameSetupConfig';
import { parseSave } from '../parse';
import { SCHEMA_VERSION } from '../schema';
import { FIXED_DATE, STEP_MS } from '../savedMatch.testkit';
import v3Save from './fixtures/v3-m8.json';
import { migrate } from './index';
import { v3ToV4 } from './v3ToV4';

/*
 * fixtures/v3-m8.json: a real M8 (schema v3) save, written by the M8
 * serializer: the default 64×64 save sim after one minute (Wonder victory
 * on), plus a Hungarian hussar for player 1.
 */

describe('v3 → v4 migration', () => {
  it('returns the data unchanged (the victory-mode enum only widened)', () => {
    const data = { schemaVersion: 3, setup: { victory: 'conquest_wonder' } };
    expect(v3ToV4(data)).toEqual(data);
    expect(migrate(data)).toEqual({ ok: true, data: { ...data, schemaVersion: 4 } });
    expect(SCHEMA_VERSION).toBe(4);
  });

  it('the v3 fixture migrates, parses and keeps its victory mode and units', () => {
    expect(v3Save.schemaVersion).toBe(3);
    const parsed = parseSave(JSON.stringify(v3Save));
    if (!parsed.ok) throw new Error(`fixture did not parse: ${parsed.reason}`);
    expect(parsed.save.schemaVersion).toBe(4);
    expect(parsed.save.setup.victory).toBe('conquest_wonder');
    expect(parsed.save.entities.filter((e) => e.components.unit?.unitType === 'hussar')).toHaveLength(1);
    const match = resumeHeadlessMatch(parsed.save);
    match.run(2_000, STEP_MS);
    expect(match.snapshot(FIXED_DATE).schemaVersion).toBe(4);
  });

  it('every victory mode round-trips through a v4 save', () => {
    for (const victory of VICTORY_MODES) {
      const s = { ...v3Save, schemaVersion: 4, setup: { ...v3Save.setup, victory } };
      const parsed = parseSave(JSON.stringify(s));
      expect(parsed.ok && parsed.save.setup.victory).toBe(victory);
    }
  });
});
