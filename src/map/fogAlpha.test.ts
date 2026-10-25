import { describe, expect, it } from 'vitest';
import { EXPLORED_ALPHA, fogAlphaTarget, stepFogAlpha } from './fogAlpha';
import { FOG_EXPLORED, FOG_UNEXPLORED, FOG_VISIBLE } from './FogOfWarData';

describe('fog alpha', () => {
  it('maps fog states to opacities', () => {
    expect(fogAlphaTarget(FOG_UNEXPLORED)).toBe(1);
    expect(fogAlphaTarget(FOG_EXPLORED)).toBe(EXPLORED_ALPHA);
    expect(fogAlphaTarget(FOG_VISIBLE)).toBe(0);
  });

  it('eases towards the target and reports when settled', () => {
    const current = new Float32Array([1, 0]);
    const target = new Float32Array([0, 0]);
    expect(stepFogAlpha(current, target, 100)).toBe(true);
    expect(current[0]).toBeGreaterThan(0);
    expect(current[0]).toBeLessThan(1);
    for (let i = 0; i < 20; i++) stepFogAlpha(current, target, 100);
    expect(current[0]).toBe(0);
    expect(stepFogAlpha(current, target, 100)).toBe(false);
  });
});
