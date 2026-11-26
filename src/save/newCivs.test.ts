import { describe, expect, it } from 'vitest';
import { resumeHeadlessMatch } from '../ai/testing/headlessMatch';
import { createUnit } from '../ecs/archetypes/createUnit';
import { parseSave } from './parse';
import { FIXED_DATE, MIN, STEP_MS, savableMatch } from './savedMatch.testkit';

describe('save round trip with the M21 civs', () => {
  it('Polish and Ottoman players and their unique units survive save, parse and resume', () => {
    const match = savableMatch({ aiCount: 1, civs: { human: 'polish', ais: ['ottoman'] } });
    match.run(MIN, STEP_MS);
    createUnit(match.world, { type: 'winged_hussar', tile: { tx: 4, ty: 2 }, playerId: 1 });
    createUnit(match.world, { type: 'janissary', tile: { tx: 5, ty: 2 }, playerId: 2 });
    const s1 = match.snapshot(FIXED_DATE);
    expect(s1.players.map((p) => p.civ)).toEqual(['polish', 'ottoman']);
    const types = s1.entities.map((e) => e.components.unit?.unitType);
    expect(types).toContain('winged_hussar');
    expect(types).toContain('janissary');

    const parsed = parseSave(JSON.stringify(s1));
    if (!parsed.ok) throw new Error(`save did not parse: ${parsed.reason}`);
    expect(parsed.save).toEqual(s1);
    const resumed = resumeHeadlessMatch(parsed.save);
    expect(resumed.snapshot(FIXED_DATE)).toEqual(s1);
    resumed.run(MIN, STEP_MS);
    expect(parseSave(JSON.stringify(resumed.snapshot(FIXED_DATE))).ok).toBe(true);
  });
});
