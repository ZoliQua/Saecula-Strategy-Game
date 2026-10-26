import { describe, expect, it } from 'vitest';
import { bilinearShare, smoothShare, tileShare } from './tileShare';

describe('tile share', () => {
  const half = (x: number) => x < 5;

  it('is 1 inside, 0 outside and 0.5 on a straight edge', () => {
    expect(smoothShare((x) => half(x), 10, 10, 1, 5)).toBe(1);
    expect(smoothShare((x) => half(x), 10, 10, 8.5, 5)).toBe(0);
    expect(smoothShare((x) => half(x), 10, 10, 4.5, 5)).toBeCloseTo(0.5);
    expect(bilinearShare((x) => half(x), 10, 10, 4.5, 5)).toBeCloseTo(0.5);
  });

  it('runs level along a diagonal staircase (a flowing outline)', () => {
    // Region x < y: its boundary is a tile staircase; lines parallel to it keep a near-constant share.
    const stairs = (x: number, y: number) => x < y;
    for (const offset of [0.2, 0.5, 0.8]) {
      const along = [6, 6.3, 6.6, 7, 7.4].map((u) => smoothShare(stairs, 20, 20, u, u + offset));
      expect(Math.max(...along) - Math.min(...along)).toBeLessThan(0.1);
    }
  });

  it('keeps a lone tile visible', () => {
    const lone = (x: number, y: number) => x === 5 && y === 5;
    expect(smoothShare(lone, 10, 10, 5, 5)).toBeLessThan(0.5);
    expect(tileShare(lone, 10, 10, 5, 5)).toBeGreaterThan(0.9);
  });
});
