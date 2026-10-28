import { describe, expect, it } from 'vitest';
import { porticusColumnU } from './porticus';

describe('porticus columns', () => {
  it('spreads two or more columns from end to end, inset 0.06', () => {
    expect(porticusColumnU(0, 1, 0, 3)).toBeCloseTo(0.06);
    expect(porticusColumnU(0, 1, 1, 3)).toBeCloseTo(0.5);
    expect(porticusColumnU(0, 1, 2, 3)).toBeCloseTo(0.94);
  });

  it('stands a lone column in the middle (no NaN)', () => {
    expect(porticusColumnU(0.2, 1.4, 0, 1)).toBeCloseTo(0.8);
  });
});
