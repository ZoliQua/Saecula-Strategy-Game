import { describe, expect, it } from 'vitest';
import { resumeHeadlessMatch } from '../../ai/testing/headlessMatch';
import { parseSave } from '../parse';
import { SCHEMA_VERSION } from '../schema';
import { FIXED_DATE, MIN, STEP_MS, savableMatch } from '../savedMatch.testkit';
import v1Save from './fixtures/v1-m6.json';
import v2Save from './fixtures/v2-m7.json';
import v3Save from './fixtures/v3-m8.json';
import v4Save from './fixtures/v4-m10.json';
import v5Save from './fixtures/v5-m11.json';
import v6Save from './fixtures/v6-m12.json';
import v7Save from './fixtures/v7-m13.json';
import v8Save from './fixtures/v8-081.json';
import v9Save from './fixtures/v9-092.json';

/**
 * 1.0 save compatibility: a real save of every schema version (the step
 * tests' fixtures, plus a fresh current-version one) parses, is restored by
 * today's code, plays on for two game minutes without an exception, and its
 * new snapshot parses again.
 */
const SAVES: ReadonlyArray<readonly [string, unknown]> = [
  ['v1 (M6)', v1Save],
  ['v2 (M7)', v2Save],
  ['v3 (M8)', v3Save],
  ['v4 (M10)', v4Save],
  ['v5 (M11)', v5Save],
  ['v6 (M12)', v6Save],
  ['v7 (M13)', v7Save],
  ['v8 (0.8.1)', v8Save],
  ['v9 (0.9.2)', v9Save],
];

describe('every schema version loads and plays on', () => {
  it('the fixtures cover every version below the current one', () => {
    expect(SAVES.map(([, s]) => (s as { schemaVersion: number }).schemaVersion)).toEqual(
      Array.from({ length: SCHEMA_VERSION - 1 }, (_, i) => i + 1),
    );
  });

  const current = (): unknown => {
    const match = savableMatch();
    match.run(MIN, STEP_MS);
    return JSON.parse(JSON.stringify(match.snapshot(FIXED_DATE)));
  };

  it.each([...SAVES, [`v${SCHEMA_VERSION} (current)`, null] as const])('%s', (_, fixture) => {
    const raw = fixture ?? current();
    const parsed = parseSave(JSON.stringify(raw));
    if (!parsed.ok) throw new Error(`did not parse: ${parsed.reason}`);
    expect(parsed.save.schemaVersion).toBe(SCHEMA_VERSION);

    const match = resumeHeadlessMatch(parsed.save);
    const players = match.players.all().length;
    expect(players).toBe(parsed.save.players.length);
    const startMs = match.timeMs();
    match.run(2 * MIN, STEP_MS);
    expect(match.timeMs()).toBeGreaterThanOrEqual(startMs + 2 * MIN - STEP_MS);
    expect(match.world.entities.some((e) => e.unit || e.building)).toBe(true);

    const again = parseSave(JSON.stringify(match.snapshot(FIXED_DATE)));
    expect(again.ok).toBe(true);
  });
});
