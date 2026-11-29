import { describe, expect, it } from 'vitest';
import { resumeHeadlessMatch } from '../../ai/testing/headlessMatch';
import { startRepair } from '../../game/repair';
import { parseSave } from '../parse';
import { SCHEMA_VERSION } from '../schema';
import { FIXED_DATE, MIN, STEP_MS } from '../savedMatch.testkit';
import v11Save from './fixtures/v11-m17.json';
import { migrate } from './index';
import { v11ToV12 } from './v11ToV12';

/* fixtures/v11-m17.json: a real M17 (schema v11) save (the default save sim after one minute), made before the bump. */

describe('v11 → v12 migration', () => {
  it("gives every player's stats a repair count of 0 and keeps everything else", () => {
    const data = { schemaVersion: 11, stats: { players: { '1': { gathered: 5 }, '2': { gathered: 0, repairsDone: 3 } }, timeline: [] }, gameTimeMs: 5 };
    const expected = { ...data, stats: { players: { '1': { gathered: 5, repairsDone: 0 }, '2': { gathered: 0, repairsDone: 0 } }, timeline: [] } };
    expect(v11ToV12(data)).toEqual(expected);
    expect(data.stats.players['1']).toEqual({ gathered: 5 });
    expect(migrate(data, 12)).toEqual({ ok: true, data: { ...expected, schemaVersion: 12 } });
    expect(SCHEMA_VERSION).toBe(12);
  });

  it('leaves stats that are not objects for the schema to reject', () => {
    expect(v11ToV12({ stats: 'x' })).toEqual({ stats: 'x' });
    expect(v11ToV12({ stats: { players: [1] } })).toEqual({ stats: { players: [1] } });
    expect(v11ToV12({ stats: { players: { '1': 3 } } })).toEqual({ stats: { players: { '1': 3 } } });
  });

  it('the v11 fixture migrates with zero repairs, parses and plays on', () => {
    expect(v11Save.schemaVersion).toBe(11);
    expect(v11Save.stats.players['1']).not.toHaveProperty('repairsDone');
    const parsed = parseSave(JSON.stringify(v11Save));
    if (!parsed.ok) throw new Error(`fixture did not parse: ${parsed.reason}`);
    expect(parsed.save.schemaVersion).toBe(SCHEMA_VERSION);
    for (const s of Object.values(parsed.save.stats.players)) expect(s.repairsDone).toBe(0);
    const match = resumeHeadlessMatch(parsed.save);
    match.run(MIN, STEP_MS);
    expect(parseSave(JSON.stringify(match.snapshot(FIXED_DATE))).ok).toBe(true);
  });

  it('a repair in progress round-trips through a save and goes on after the load', () => {
    const parsed = parseSave(JSON.stringify(v11Save));
    if (!parsed.ok) throw new Error(parsed.reason);
    const match = resumeHeadlessMatch(parsed.save);
    const tc = match.world.entities.find((e) => e.building?.type === 'town_center' && e.owner?.playerId === 1);
    const v = match.world.entities.find((e) => e.unit?.unitType === 'villager' && e.owner?.playerId === 1);
    if (!tc?.health || !v) throw new Error('no town centre or villager');
    tc.health.current = 1000;
    startRepair(match.world, v, tc);
    match.run(10_000, STEP_MS);
    const mid = tc.health.current;
    expect(mid).toBeGreaterThan(1000);
    expect(v.repairIntent).toBeDefined();
    const saved = match.snapshot(FIXED_DATE);
    const back = parseSave(JSON.stringify(saved));
    if (!back.ok) throw new Error(back.reason);
    const again = resumeHeadlessMatch(back.save);
    const v2 = again.world.entities.find((e) => e.id === v.id);
    const tc2 = again.world.entities.find((e) => e.id === tc.id);
    expect(v2?.repairIntent).toEqual(v.repairIntent);
    expect(tc2?.health?.current).toBe(mid);
    again.run(10_000, STEP_MS);
    expect(tc2!.health!.current).toBeGreaterThan(mid);
    const bad = { ...saved, entities: saved.entities.map((e) => (e.id === v.id ? { ...e, components: { ...e.components, repairIntent: { targetId: 1, costCarry: { food: -1, wood: 0, gold: 0 }, hpCarry: 0 } } } : e)) };
    expect(parseSave(JSON.stringify(bad)).ok).toBe(false);
  });
});
