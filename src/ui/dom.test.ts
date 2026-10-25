import { describe, expect, it } from 'vitest';
import { formatClock } from './dom';

describe('formatClock', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65_400)).toBe('1:05');
    expect(formatClock(3_600_000)).toBe('60:00');
  });
});
