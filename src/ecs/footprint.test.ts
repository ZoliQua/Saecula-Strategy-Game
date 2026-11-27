import { describe, expect, it } from 'vitest';
import { footprintCentre } from './footprint';

describe('footprintCentre', () => {
  it('is the tile itself for 1×1, the middle tile for odd sizes and fractional for even ones', () => {
    expect(footprintCentre({ tx: 5, ty: 7 }, { width: 1, height: 1 })).toEqual({ tx: 5, ty: 7 });
    expect(footprintCentre({ tx: 5, ty: 7 }, { width: 3, height: 3 })).toEqual({ tx: 6, ty: 8 });
    expect(footprintCentre({ tx: 4, ty: 4 }, { width: 2, height: 4 })).toEqual({ tx: 4.5, ty: 5.5 });
  });
});
