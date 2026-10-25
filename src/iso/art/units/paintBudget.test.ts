import { describe, expect, it } from 'vitest';
import { spendPaintBudget } from './paintBudget';

describe('spendPaintBudget', () => {
  it('stops after the first item that made progress, even partial', () => {
    let t = 0;
    const calls: string[] = [];
    const worked = spendPaintBudget(
      ['a', 'b', 'c'],
      5,
      (item) => {
        calls.push(item);
        t += 6; // overruns the budget mid-frame (partial progress)
        return { worked: true };
      },
      () => t,
    );
    expect(worked).toBe('a');
    expect(calls).toEqual(['a']);
  });

  it('shares one deadline: later items only get what is left', () => {
    let t = 0;
    const given: number[] = [];
    spendPaintBudget(
      ['done1', 'done2', 'x'],
      5,
      (_item, remaining) => {
        given.push(remaining);
        t += 2; // finished-queue items do no work but still cost time
        return { worked: false };
      },
      () => t,
    );
    expect(given).toEqual([5, 3, 1]);
  });

  it('skips the rest once the frame budget is gone', () => {
    let t = 0;
    const calls: string[] = [];
    spendPaintBudget(
      ['a', 'b'],
      5,
      (item) => {
        calls.push(item);
        t += 5;
        return { worked: false };
      },
      () => t,
    );
    expect(calls).toEqual(['a']);
  });
});
