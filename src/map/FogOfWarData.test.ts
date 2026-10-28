import { describe, expect, it } from 'vitest';
import { FOG_EXPLORED, FOG_VISIBLE, FogOfWarData } from './FogOfWarData';

describe('FogOfWarData.load', () => {
  it('copies the states and bumps the revision', () => {
    const fog = new FogOfWarData(3, 2);
    const states = new Uint8Array([0, 1, 2, 2, 1, 0]);
    const before = fog.revision;
    fog.load(states);
    states[0] = FOG_VISIBLE;
    expect(fog.get(0, 0)).toBe(0);
    expect(fog.get(1, 0)).toBe(FOG_EXPLORED);
    expect(fog.isVisible(0, 1)).toBe(true);
    expect(fog.revision).toBe(before + 1);
  });

  it('throws RangeError on a length mismatch', () => {
    const fog = new FogOfWarData(3, 2);
    expect(() => fog.load(new Uint8Array(5))).toThrow(RangeError);
  });
});
