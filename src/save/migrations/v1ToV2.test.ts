import { describe, expect, it } from 'vitest';
import { resumeHeadlessMatch } from '../../ai/testing/headlessMatch';
import { parseSave } from '../parse';
import { FIXED_DATE, STEP_MS } from '../savedMatch.testkit';
import { zeroStats } from '../../stats/MatchStats';
import v1Save from './fixtures/v1-m6.json';
import { migrate } from './index';
import { v1ToV2 } from './v1ToV2';

/*
 * fixtures/v1-m6.json: a real M6 (schema v1) save, written by the M6
 * serializer from savableMatch() after 3 game minutes, before v2 existed.
 */

describe('v1 → v2 migration', () => {
  it('adds zeroed stats for every saved player and an empty timeline', () => {
    const out = v1ToV2({ schemaVersion: 1, players: [{ id: 1 }, { id: 2 }, { id: 4 }] });
    expect(out['stats']).toEqual({ players: { '1': zeroStats(), '2': zeroStats(), '4': zeroStats() }, timeline: [] });
    expect(migrate({ schemaVersion: 1, players: [{ id: 1 }] }, 2)).toEqual({
      ok: true,
      data: { schemaVersion: 2, players: [{ id: 1 }], stats: { players: { '1': zeroStats() }, timeline: [] }, matchId: expect.any(String) as unknown },
    });
  });

  it('gives the match an id: the same for the same v1 save (one match log record however often it is loaded)', () => {
    const at = '2026-10-20T10:00:00.000Z';
    const a = v1ToV2({ schemaVersion: 1, createdAt: at, setup: { seed: 9 }, players: [] })['matchId'];
    const b = v1ToV2({ schemaVersion: 1, createdAt: at, setup: { seed: 9 }, players: [] })['matchId'];
    const other = v1ToV2({ schemaVersion: 1, createdAt: '2026-10-20T10:05:00.000Z', setup: { seed: 9 }, players: [] })['matchId'];
    expect(typeof a).toBe('string');
    expect(a).toBe(b);
    expect(other).not.toBe(a);
    // Without a createdAt there is nothing to derive it from: a fresh random id.
    const random = v1ToV2({ schemaVersion: 1 })['matchId'];
    expect(typeof random).toBe('string');
    expect(random).not.toBe(v1ToV2({ schemaVersion: 1 })['matchId']);
  });

  it('a save without players still migrates (zod then rejects it as corrupt)', () => {
    expect(v1ToV2({ schemaVersion: 1 })['stats']).toEqual({ players: {}, timeline: [] });
  });

  it('an M6 v1 save fixture loads, resumes with zeroed stats and plays on', () => {
    expect(v1Save.schemaVersion).toBe(1);
    const parsed = parseSave(JSON.stringify(v1Save));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const save = parsed.save;
    expect(save.schemaVersion).toBe(3);
    expect(save.matchId).toBe(`v1-${v1Save.setup.seed}-${v1Save.createdAt}`);
    expect(Object.keys(save.stats.players)).toEqual(save.players.map((p) => String(p.id)));
    expect(Object.values(save.stats.players).every((s) => s.gathered === 0 && s.ageUpAtMs.length === 0)).toBe(true);

    const match = resumeHeadlessMatch(save);
    expect(match.snapshot(FIXED_DATE)).toEqual({ ...save, createdAt: FIXED_DATE.toISOString() });
    // Saved at 3:00; the first sample falls at 4:00.
    match.run(61_000, STEP_MS);
    expect(match.stats.timeline.map((t) => t.tMs)).toEqual([240_000]);
    expect(match.stats.timeline[0]!.scores).toHaveLength(save.players.length);
    expect(match.stats.of(2).gathered).toBeGreaterThan(0);
  }, 60_000);
});
