import { describe, expect, it } from 'vitest';
import { sunAt } from '../iso/art/lighting/sun';
import { surfaceLighting } from './surfaceLighting';

describe('surfaceLighting', () => {
  it('feeds the live sun, plateau shadows and specular when lighting is active', () => {
    const sun = sunAt(0.62);
    const u = surfaceLighting(sun, true, 0.6);
    expect(u.lit).toBe(1);
    expect(u.sunDir).toEqual(sun.dir);
    expect(u.shadow[2]).toBeGreaterThan(0);
  });

  it('turns plateau shadows and specular off when lighting is inactive', () => {
    const u = surfaceLighting(sunAt(0.62), false, 0.6);
    expect(u.lit).toBe(0);
    expect(u.shadow).toEqual([0, 0, 0]);
    // A fixed daylight look, independent of the cycle.
    expect(surfaceLighting(sunAt(0.1), false, 0.6)).toEqual(u);
  });
});
