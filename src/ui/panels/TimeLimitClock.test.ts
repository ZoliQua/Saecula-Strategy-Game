import { describe, expect, it } from 'vitest';
import type { TimeLimitInfo } from '../store';
import { enteredFinal, timeLimitLabels } from './TimeLimitClock';

const info = (o: Partial<TimeLimitInfo> = {}): TimeLimitInfo => ({ remainingMs: 754_000, leaderId: 2, leaderColor: 0xff0000, final: false, ...o });

describe('TimeLimitClock', () => {
  it('labels: time left as a clock, the leader as "you" for the human', () => {
    expect(timeLimitLabels(info())).toEqual({ time: 'Időkorlát: 12:34', leader: 'Éllovas' });
    expect(timeLimitLabels(info({ leaderId: 1 })).leader).toBe('Te vezetsz');
  });

  it('enteredFinal fires once, on the first final update', () => {
    expect(enteredFinal(null, info())).toBe(false);
    expect(enteredFinal(info(), info({ final: true }))).toBe(true);
    expect(enteredFinal(null, info({ final: true }))).toBe(true);
    expect(enteredFinal(info({ final: true }), info({ final: true, remainingMs: 1 }))).toBe(false);
  });
});
