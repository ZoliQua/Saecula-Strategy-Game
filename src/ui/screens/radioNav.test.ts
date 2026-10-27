import { describe, expect, it } from 'vitest';
import { arrowStep, nextEnabled } from './radioNav';

describe('arrowStep', () => {
  it('maps arrow keys to a step and ignores the rest', () => {
    expect(arrowStep('ArrowRight')).toBe(1);
    expect(arrowStep('ArrowDown')).toBe(1);
    expect(arrowStep('ArrowLeft')).toBe(-1);
    expect(arrowStep('ArrowUp')).toBe(-1);
    expect(arrowStep('Enter')).toBe(0);
  });
});

describe('nextEnabled', () => {
  const enabled = [true, true, false, false];

  it('moves to the neighbour', () => {
    expect(nextEnabled(enabled, 0, 1)).toBe(1);
    expect(nextEnabled(enabled, 1, -1)).toBe(0);
  });

  it('skips disabled options and wraps around both ends', () => {
    expect(nextEnabled(enabled, 1, 1)).toBe(0);
    expect(nextEnabled(enabled, 0, -1)).toBe(1);
  });

  it('returns -1 when nothing is enabled', () => {
    expect(nextEnabled([false, false], 0, 1)).toBe(-1);
  });

  it('visits all 9 options in order and wraps ("Vegyes" plus eight civs, Review Focus 5)', () => {
    const nine = Array.from({ length: 9 }, () => true);
    const forward: number[] = [];
    for (let i = 0, at = 0; i < 9; i++) forward.push((at = nextEnabled(nine, at, 1)));
    expect(forward).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
    const back: number[] = [];
    for (let i = 0, at = 0; i < 9; i++) back.push((at = nextEnabled(nine, at, -1)));
    expect(back).toEqual([8, 7, 6, 5, 4, 3, 2, 1, 0]);
  });
});
