import { describe, expect, it } from 'vitest';
import { alignOut, alphaBounds, shelfPack } from './occluderPacking';

describe('occluder packing', () => {
  it('finds the opaque bounds of a cell, aligned outward', () => {
    const stride = 16;
    const data = new Uint8ClampedArray(stride * 16 * 4);
    const set = (x: number, y: number) => (data[(y * stride + x) * 4 + 3] = 200);
    set(9, 5);
    set(12, 10);
    // Cell at (8, 4), 8×12: content spans x 1..4, y 1..6 inside it.
    expect(alphaBounds(data, stride, { x: 8, y: 4, w: 8, h: 12 }, 1)).toEqual({ x: 1, y: 1, w: 4, h: 6 });
    expect(alphaBounds(data, stride, { x: 8, y: 4, w: 8, h: 12 }, 4)).toEqual({ x: 0, y: 0, w: 8, h: 8 });
    expect(alphaBounds(data, stride, { x: 0, y: 0, w: 8, h: 4 }, 4)).toBeNull();
  });

  it('packs rows tallest first without overlap and within the width', () => {
    const sizes = [
      { w: 40, h: 10 },
      { w: 30, h: 30 },
      { w: 50, h: 20 },
      { w: 20, h: 20 },
    ];
    const { at, height } = shelfPack(sizes, 64);
    const rects = sizes.map((s, i) => ({ x: at[i]?.[0] ?? -1, y: at[i]?.[1] ?? -1, ...s }));
    for (const r of rects) {
      expect(r.x + r.w).toBeLessThanOrEqual(64);
      expect(r.y + r.h).toBeLessThanOrEqual(height);
    }
    rects.forEach((a, i) => {
      rects.slice(i + 1).forEach((b) => {
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap).toBe(false);
      });
    });
    // Rows: [30×30], [50×20], [20×20 + 40×10].
    expect(height).toBe(30 + 20 + 20);
  });

  it('keeps a gutter between packed rectangles (no filtering bleed across frames)', () => {
    const sizes = [
      { w: 8, h: 8 },
      { w: 8, h: 4 },
      { w: 12, h: 8 },
      { w: 4, h: 4 },
    ];
    const gutter = 4;
    const { at, height } = shelfPack(sizes, 32, gutter);
    const rects = sizes.map((s, i) => ({ x: at[i]?.[0] ?? -1, y: at[i]?.[1] ?? -1, ...s }));
    rects.forEach((a, i) => {
      expect(a.x % gutter).toBe(0);
      expect(a.y % gutter).toBe(0);
      expect(a.x + a.w).toBeLessThanOrEqual(32);
      expect(a.y + a.h + gutter).toBeLessThanOrEqual(height);
      rects.slice(i + 1).forEach((b) => {
        // Grown by the gutter, no two rectangles may touch.
        const near = a.x < b.x + b.w + gutter && b.x < a.x + a.w + gutter && a.y < b.y + b.h + gutter && b.y < a.y + a.h + gutter;
        expect(near).toBe(false);
      });
    });
  });

  it('grows a rectangle outward onto an alignment grid (negative coordinates too)', () => {
    expect(alignOut({ x: -35, y: -75, w: 64, h: 91 }, 4)).toEqual({ x: -36, y: -76, w: 68, h: 92 });
    expect(alignOut({ x: 8, y: 4, w: 8, h: 8 }, 4)).toEqual({ x: 8, y: 4, w: 8, h: 8 });
  });
});
