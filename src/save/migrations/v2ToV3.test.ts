import { describe, expect, it } from 'vitest';
import { resumeHeadlessMatch } from '../../ai/testing/headlessMatch';
import { createUnit } from '../../ecs/archetypes/createUnit';
import { toSelectedInfo, type SelectableWithPos } from '../../ecs/systems/selectedInfo';
import type { UniqueUnitType } from '../../types';
import { parseSave } from '../parse';
import { SCHEMA_VERSION } from '../schema';
import { FIXED_DATE, STEP_MS, savableMatch } from '../savedMatch.testkit';
import v2Save from './fixtures/v2-m7.json';
import { migrate } from './index';
import { v2ToV3 } from './v2ToV3';

const UNIQUE_UNIT_TYPES: readonly UniqueUnitType[] = ['hussar', 'longbowman', 'landsknecht', 'mousquetaire', 'conquistador', 'legionary', 'cossack', 'sissi'];

/*
 * fixtures/v2-m7.json: a real M7 (schema v2) save, written by the M7
 * serializer: a Hungarian player 1 owning three knights (one at 77 HP) and a stable.
 */

describe('v2 → v3 migration', () => {
  it('returns the data unchanged (the unit-type enum only widened)', () => {
    const data = { schemaVersion: 2, players: [{ id: 1 }], entities: [{ id: 3 }] };
    expect(v2ToV3(data)).toEqual(data);
    expect(migrate(data)).toEqual({ ok: true, data: { ...data, schemaVersion: 3 } });
    expect(SCHEMA_VERSION).toBe(3);
  });

  it('a v2 fixture migrates to version 3 and parses', () => {
    expect(v2Save.schemaVersion).toBe(2);
    expect(migrate(v2Save)).toMatchObject({ ok: true, data: { schemaVersion: 3 } });
    const parsed = parseSave(JSON.stringify(v2Save));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.save.schemaVersion).toBe(3);
  });

  it('loads a v2 save whose civ now trains a unique unit instead', () => {
    const parsed = parseSave(JSON.stringify(v2Save));
    if (!parsed.ok) throw new Error(`fixture did not parse: ${parsed.reason}`);
    const match = resumeHeadlessMatch(parsed.save);
    const mine = match.world.entities.filter((e) => e.owner?.playerId === 1);

    const knights = mine.filter((e) => e.unit?.unitType === 'knight');
    expect(knights).toHaveLength(3);
    expect(knights.filter((k) => k.health?.current === 77)).toHaveLength(1);
    expect(knights.filter((k) => k.health?.current === k.health?.max)).toHaveLength(2);

    const stable = mine.find((e) => e.building?.type === 'stable');
    expect(stable).toBeDefined();
    const info = toSelectedInfo(stable as SelectableWithPos, (id) => match.players.get(id)?.civ ?? 'hungarian');
    if (info?.kind !== 'building') throw new Error('the stable is not a building');
    expect(info.civ).toBe('hungarian');
    expect(info.trainable).toEqual(['hussar', 'cavalry']);
    // The loaded save plays on and snapshots as v3.
    expect(match.snapshot(FIXED_DATE).schemaVersion).toBe(3);
  });

  it('a save holding all 8 unique units round-trips identically, through JSON too', () => {
    const match = savableMatch();
    match.run(5_000, STEP_MS); // fog of war is computed on the first steps
    UNIQUE_UNIT_TYPES.forEach((type, i) => createUnit(match.world, { type, tile: { tx: 4 + i, ty: 4 }, playerId: 1 }));
    const s = match.snapshot(FIXED_DATE);
    expect(s.entities.filter((e) => e.components.unit && (UNIQUE_UNIT_TYPES as readonly string[]).includes(e.components.unit.unitType))).toHaveLength(8);
    const parsed = parseSave(JSON.stringify(s));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.save).toEqual(s);
    expect(resumeHeadlessMatch(parsed.save).snapshot(FIXED_DATE)).toEqual(s);
  });
});
