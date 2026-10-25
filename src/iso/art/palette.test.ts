import { describe, expect, it } from 'vitest';
import { fbm, hash2, hexToRgb, mix, rgbToHex, shade, tileVariant } from './palette';

describe('palette helpers', () => {
  it('round-trips hex ↔ rgb', () => {
    expect(rgbToHex(hexToRgb(0x12abef))).toBe(0x12abef);
  });

  it('shade clamps to valid bytes', () => {
    expect(shade(0xffffff, 2)).toBe(0xffffff);
    expect(shade(0x808080, 0)).toBe(0x000000);
  });

  it('mix interpolates endpoints', () => {
    expect(mix(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(mix(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(mix(0x000000, 0xfefefe, 0.5)).toBe(0x7f7f7f);
  });

  it('hash2 is deterministic and in [0,1)', () => {
    for (let i = 0; i < 100; i++) {
      const v = hash2(i, i * 3, 5);
      expect(v).toBe(hash2(i, i * 3, 5));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('fbm stays in [0,1)', () => {
    for (let i = 0; i < 200; i++) {
      const v = fbm(i * 0.37, i * 0.91, 3);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('tileVariant spreads across all variants', () => {
    const seen = new Set<number>();
    for (let tx = 0; tx < 20; tx++) {
      for (let ty = 0; ty < 20; ty++) seen.add(tileVariant(tx, ty, 4));
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });
});
