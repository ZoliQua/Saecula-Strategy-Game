import { describe, expect, it } from 'vitest';
import { TIME_VICTORY } from '../config/balance';
import { hasTimeVictory, hasWonderVictory, VICTORY_MODES } from './GameSetupConfig';
import { holdsTimeLead, timeLeader } from './timeVictory';

const table = (rows: Record<number, { score: number; killValue?: number; defeated?: boolean }>) => ({
  players: Object.entries(rows).map(([id, r]) => ({ id: Number(id), defeated: r.defeated ?? false })),
  standing: (id: number) => ({ score: rows[id]?.score ?? 0, killValue: rows[id]?.killValue ?? 0 }),
});

describe('time victory', () => {
  it('limit is 60 minutes, the hold-lead window the last 5', () => {
    expect(TIME_VICTORY.limitMs).toBe(3_600_000);
    expect(TIME_VICTORY.holdLeadMs).toBe(300_000);
  });

  it('modes: which victories each one enables', () => {
    expect(VICTORY_MODES).toEqual(['conquest', 'conquest_wonder', 'conquest_time', 'all']);
    expect(VICTORY_MODES.map(hasWonderVictory)).toEqual([false, true, false, true]);
    expect(VICTORY_MODES.map(hasTimeVictory)).toEqual([false, false, true, true]);
  });

  it('leader: highest score among standing players', () => {
    const t = table({ 1: { score: 500 }, 2: { score: 900 }, 3: { score: 700 } });
    expect(timeLeader(t.players, t.standing)).toBe(2);
  });

  it('a defeated player never leads', () => {
    const t = table({ 1: { score: 500 }, 2: { score: 900, defeated: true }, 3: { score: 700 } });
    expect(timeLeader(t.players, t.standing)).toBe(3);
  });

  it('tie: more kill value, then the lower player id', () => {
    const k = table({ 1: { score: 800, killValue: 10 }, 2: { score: 800, killValue: 50 } });
    expect(timeLeader(k.players, k.standing)).toBe(2);
    const i = table({ 3: { score: 800, killValue: 50 }, 2: { score: 800, killValue: 50 } });
    expect(timeLeader(i.players, i.standing)).toBe(2);
  });

  it('nobody standing: no leader', () => {
    const t = table({ 1: { score: 5, defeated: true } });
    expect(timeLeader(t.players, t.standing)).toBeNull();
  });

  it('holdsTimeLead: only the leader, only inside the final window', () => {
    expect(holdsTimeLead(2, { remainingMs: TIME_VICTORY.holdLeadMs, leaderId: 2 })).toBe(true);
    expect(holdsTimeLead(2, { remainingMs: TIME_VICTORY.holdLeadMs + 1, leaderId: 2 })).toBe(false);
    expect(holdsTimeLead(3, { remainingMs: 1000, leaderId: 2 })).toBe(false);
    expect(holdsTimeLead(2, undefined)).toBe(false);
  });
});

describe('TimeLimitWatch', () => {
  it('counts down from the start time and re-reads the leader at most once a second', async () => {
    const { TimeLimitWatch } = await import('./timeVictory');
    const scores: Record<number, number> = { 1: 10, 2: 20 };
    let reads = 0;
    const stats = { scoreOf: (id: number) => (reads++, scores[id] ?? 0), of: () => ({ killValue: 0 }) };
    const players = { all: () => [{ id: 1, defeated: false }, { id: 2, defeated: false }] };
    const w = new TimeLimitWatch(players, stats, 1_000_000);
    expect(w.view()).toEqual({ remainingMs: TIME_VICTORY.limitMs - 1_000_000, leaderId: 2 });
    scores[1] = 99;
    w.advance(500);
    expect(w.view().leaderId).toBe(2);
    const before = reads;
    w.advance(500);
    expect(w.view()).toEqual({ remainingMs: TIME_VICTORY.limitMs - 1_001_000, leaderId: 1 });
    expect(reads).toBe(before + 2);
    w.advance(TIME_VICTORY.limitMs);
    expect(w.view().remainingMs).toBe(0);
  });
});
