import { describe, expect, it } from 'vitest';
import { refundFor, refundPercent, siteProgress } from './refund';

const cost = { food: 0, wood: 100, gold: 0 };

describe('refundFor (deleting a building)', () => {
  it('refunds 80 % of an unstarted site', () => {
    expect(refundPercent(0)).toBe(80);
    expect(refundFor(cost, 0)).toEqual({ food: 0, wood: 80, gold: 0 });
  });

  it('falls with progress: 49 % built → (100 − 49) × 0.8 = 40.8 → 41 %', () => {
    expect(refundPercent(0.49)).toBe(41);
    expect(refundFor(cost, 0.49)).toEqual({ food: 0, wood: 41, gold: 0 });
  });

  it('still refunds 40 % at exactly half built', () => {
    expect(refundPercent(0.5)).toBe(40);
    expect(refundFor(cost, 0.5)).toEqual({ food: 0, wood: 40, gold: 0 });
  });

  it('refunds nothing past half built', () => {
    expect(refundPercent(0.51)).toBe(0);
    expect(refundFor(cost, 0.51)).toEqual({ food: 0, wood: 0, gold: 0 });
  });

  it('refunds nothing for a finished building', () => {
    expect(refundFor(cost, null)).toEqual({ food: 0, wood: 0, gold: 0 });
    expect(refundPercent(null)).toBe(0);
  });

  it('rounds each resource of a mixed cost', () => {
    expect(refundFor({ food: 0, wood: 125, gold: 50 }, 0.25)).toEqual({ food: 0, wood: 75, gold: 30 });
  });

  it('clamps the progress of a site to [0, 1]', () => {
    expect(siteProgress({ elapsed: 0, totalTime: 10 })).toBe(0);
    expect(siteProgress({ elapsed: 5, totalTime: 10 })).toBe(0.5);
    expect(siteProgress({ elapsed: 15, totalTime: 10 })).toBe(1);
    expect(siteProgress({ elapsed: -1, totalTime: 10 })).toBe(0);
    expect(siteProgress({ elapsed: 1, totalTime: 0 })).toBe(1);
  });
});
