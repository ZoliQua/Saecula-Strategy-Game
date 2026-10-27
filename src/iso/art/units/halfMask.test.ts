import { describe, expect, it } from 'vitest';
import { halveMask } from './halfMask';

/** RGBA pixels from [r, g, b, a] tuples, row-major. */
const rgba = (...px: Array<[number, number, number, number]>) => new Uint8ClampedArray(px.flat());

describe('halveMask', () => {
  it('averages each 2×2 block weighted by alpha, so transparent texels add no dark fringe', () => {
    // One opaque grey texel among three transparent black ones.
    const half = halveMask(rgba([200, 200, 200, 255], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]), 2, 2);
    expect(half.width).toBe(1);
    expect(half.height).toBe(1);
    expect([...half.data]).toEqual([200, 200, 200, 64]);
  });

  it('keeps a fully covered block exact and leaves an empty block fully transparent', () => {
    const src = rgba(
      [100, 100, 100, 255], [100, 100, 100, 255], [0, 0, 0, 0], [0, 0, 0, 0],
      [100, 100, 100, 255], [100, 100, 100, 255], [0, 0, 0, 0], [0, 0, 0, 0],
    );
    const half = halveMask(src, 4, 2);
    expect([...half.data]).toEqual([100, 100, 100, 255, 0, 0, 0, 0]);
  });

  it('rounds odd sides up (the last row / column averages what exists)', () => {
    const half = halveMask(rgba([10, 20, 30, 255], [10, 20, 30, 255], [10, 20, 30, 255]), 3, 1);
    expect(half.width).toBe(2);
    expect(half.height).toBe(1);
    expect([...half.data]).toEqual([10, 20, 30, 255, 10, 20, 30, 255]);
  });
});
