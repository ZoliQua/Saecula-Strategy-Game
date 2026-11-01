import { describe, expect, it } from 'vitest';
import { resumeHeadlessMatch } from '../../ai/testing/headlessMatch';
import { createUnit } from '../../ecs/archetypes/createUnit';
import { parseSave } from '../parse';
import { SCHEMA_VERSION } from '../schema';
import { FIXED_DATE, STEP_MS, savableMatch } from '../savedMatch.testkit';
import v4Save from './fixtures/v4-m10.json';
import { migrate } from './index';
import { v4ToV5 } from './v4ToV5';

/* fixtures/v4-m10.json: a real M10 (schema v4) save, written by the M10 serializer (the default save sim after one minute). */

describe('v4 → v5 migration', () => {
  it('returns the data unchanged (enums widened, components added)', () => {
    const data = { schemaVersion: 4, entities: [{ id: 3 }] };
    expect(v4ToV5(data)).toEqual(data);
    expect(migrate(data)).toEqual({ ok: true, data: { ...data, schemaVersion: 5 } });
    expect(SCHEMA_VERSION).toBe(5);
  });

  it('the v4 fixture migrates, parses and plays on', () => {
    expect(v4Save.schemaVersion).toBe(4);
    const parsed = parseSave(JSON.stringify(v4Save));
    if (!parsed.ok) throw new Error(`fixture did not parse: ${parsed.reason}`);
    expect(parsed.save.schemaVersion).toBe(5);
    const match = resumeHeadlessMatch(parsed.save);
    match.run(2_000, STEP_MS);
    expect(match.snapshot(FIXED_DATE).schemaVersion).toBe(5);
  });

  it('a save with a channelling monk, a recharging monk and a converted unit round-trips exactly', () => {
    const match = savableMatch();
    match.run(5_000, STEP_MS);
    const monk = createUnit(match.world, { type: 'monk', tile: { tx: 6, ty: 6 }, playerId: 1 });
    const tired = createUnit(match.world, { type: 'monk', tile: { tx: 7, ty: 6 }, playerId: 1 });
    tired.converter!.rechargeMs = 12_345;
    tired.converter!.healCarry = 0.5;
    const target = createUnit(match.world, { type: 'archer', tile: { tx: 9, ty: 6 }, playerId: 2 });
    match.world.addComponent(monk, 'convertIntent', { targetId: target.id!, elapsedMs: 2500 });
    const turned = createUnit(match.world, { type: 'knight', tile: { tx: 10, ty: 8 }, playerId: 1 });
    match.world.addComponent(turned, 'originCiv', { civ: 'english' });
    const s = match.snapshot(FIXED_DATE);
    const parsed = parseSave(JSON.stringify(s));
    if (!parsed.ok) throw new Error(parsed.reason);
    expect(parsed.save).toEqual(s);
    const resumed = resumeHeadlessMatch(parsed.save).snapshot(FIXED_DATE);
    expect(resumed).toEqual(s);
    const byId = (id: number) => resumed.entities.find((e) => e.id === id)?.components;
    expect(byId(monk.id!)?.convertIntent).toEqual({ targetId: target.id, elapsedMs: 2500 });
    expect(byId(tired.id!)?.converter).toEqual({ rechargeMs: 12_345, healCarry: 0.5, busy: false });
    expect(byId(turned.id!)?.originCiv).toEqual({ civ: 'english' });
  });
});
