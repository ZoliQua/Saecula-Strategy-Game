import { describe, expect, it } from 'vitest';
import { resumeHeadlessMatch } from '../../ai/testing/headlessMatch';
import { createUnit } from '../../ecs/archetypes/createUnit';
import { createResourceNode } from '../../ecs/archetypes/resource';
import { TERRAIN } from '../../map/TerrainTypes';
import { restoreMatch } from '../deserializer';
import { parseSave } from '../parse';
import { SCHEMA_VERSION } from '../schema';
import { FIXED_DATE, STEP_MS, savableMatch } from '../savedMatch.testkit';
import v8Save from './fixtures/v8-081.json';
import { migrate } from './index';
import { v8ToV9 } from './v8ToV9';

/* fixtures/v8-081.json: a real 0.8.1 (schema v8) save (the default save sim after one minute). */

describe('v8 → v9 migration', () => {
  it('returns the data unchanged (ships, dock, fish and cargo are new optional data)', () => {
    const data = { schemaVersion: 8, setup: { victory: 'conquest' } };
    expect(v8ToV9(data)).toEqual(data);
    expect(migrate(data, 9)).toEqual({ ok: true, data: { ...data, schemaVersion: 9 } });
  });

  it('the v8 fixture migrates, parses and plays on', () => {
    expect(v8Save.schemaVersion).toBe(8);
    const parsed = parseSave(JSON.stringify(v8Save));
    if (!parsed.ok) throw new Error(`fixture did not parse: ${parsed.reason}`);
    expect(parsed.save.schemaVersion).toBe(SCHEMA_VERSION);
    const match = resumeHeadlessMatch(parsed.save);
    match.run(2_000, STEP_MS);
    expect(match.snapshot(FIXED_DATE).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('a loaded transport, its order and a fish school survive JSON and a restore', () => {
    const match = savableMatch();
    match.run(2_000, STEP_MS);
    const { world, map: mapData } = match;
    mapData.setTile(2, 2, TERRAIN.water);
    mapData.setTile(3, 2, TERRAIN.fish);
    createResourceNode(world, { tile: { tx: 3, ty: 2 }, type: 'food', amount: 200, sea: true });
    const ship = createUnit(world, { type: 'transport', tile: { tx: 2, ty: 2 }, playerId: 1 });
    const passenger = createUnit(world, { type: 'swordsman', tile: { tx: 9, ty: 9 }, playerId: 1 });
    world.remove(passenger);
    world.addComponent(ship, 'cargo', { units: [passenger] });
    world.addComponent(ship, 'unloadIntent', { target: { tx: 9, ty: 9 } });
    const save = match.snapshot(FIXED_DATE);
    const parsed = parseSave(JSON.stringify(save));
    if (!parsed.ok) throw new Error(parsed.reason);
    expect(parsed.save).toEqual(save);
    const restored = restoreMatch(parsed.save);
    const back = restored.world.entities.find((e) => e.unit?.unitType === 'transport')!;
    expect(back.cargo?.units.map((u) => u.unit?.unitType)).toEqual(['swordsman']);
    expect(back.cargo?.units[0]?.id).toBe(passenger.id);
    expect(back.unloadIntent).toEqual({ target: { tx: 9, ty: 9 } });
    expect(restored.mapData.getTile(3, 2)).toBe(TERRAIN.fish);
    expect(restored.world.entities.find((e) => e.resourceNode?.sea)?.resourceNode?.amount).toBe(200);
  });
});
