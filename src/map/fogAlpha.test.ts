import { describe, expect, it } from 'vitest';
import { EXPLORED_ALPHA, fogAlphaTarget, fogOwners, stepFogAlpha } from './fogAlpha';
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

describe('fogOwners', () => {
  it('gives each fog pixel the tile whose surface shows there: its own ground, or the rock rising over it', () => {
    // 2×1 map, 2 px per tile, 1 tile of pad: canvas 8×6; pixel (px, py) is ground point ((px + 0.5) / 2 − 1.5, …).
    const rockOf = (u: number, v: number) => (u > -0.5 && u < 0.5 && v > -0.5 && v < 0.5 ? 1 : -1);
    const owners = fogOwners(2, 1, 2, 1, rockOf);
    expect(owners.length).toBe(8 * 6);
    const at = (px: number, py: number) => owners[py * 8 + px];
    // Ground of tile (0, 0) under raised rock of tile (1, 0) takes the rock's tile.
    expect(at(2, 2)).toBe(1);
    // Tile (1, 0) ground: its own index; beyond the map: none.
    expect(at(4, 2)).toBe(1);
    expect(at(0, 0)).toBe(-1);
    expect(at(7, 5)).toBe(-1);
  });
});
