import { describe, expect, it } from 'vitest';
import { flightDurationMs, projectileMotion } from './projectileMotion';

const from = { x: 2, y: 2 };
const to = { x: 6, y: 2 };

describe('projectileMotion', () => {
  it('starts and ends on the ground at the endpoints', () => {
    const a = projectileMotion(from, to, 0, 1.5);
    const b = projectileMotion(from, to, 1, 1.5);
    expect(a).toMatchObject({ x: 2, y: 2, height: 0 });
    expect(b).toMatchObject({ x: 6, y: 2, height: 0 });
  });

  it('peaks at arcHeight halfway and is flat for arcHeight 0', () => {
    expect(projectileMotion(from, to, 0.5, 1.5).height).toBeCloseTo(1.5);
    expect(projectileMotion(from, to, 0.5, 0).height).toBe(0);
  });

  it('clamps t outside 0..1', () => {
    expect(projectileMotion(from, to, -1, 1).x).toBe(2);
    expect(projectileMotion(from, to, 2, 1).x).toBe(6);
  });

  it('tangent rises then falls for an arc and is the ground heading when flat', () => {
    // +x in tile space heads right and down on screen (angle > 0 when flat).
    const flat = projectileMotion(from, to, 0.5, 0).angle;
    expect(flat).toBeGreaterThan(0);
    expect(projectileMotion(from, to, 0.1, 2).angle).toBeLessThan(flat);
    expect(projectileMotion(from, to, 0.9, 2).angle).toBeGreaterThan(flat);
  });

  it('lifts the screen position by the height', () => {
    const m = projectileMotion(from, to, 0.5, 1);
    const ground = projectileMotion(from, to, 0.5, 0);
    expect(m.sy).toBeLessThan(ground.sy);
    expect(m.sx).toBeCloseTo(ground.sx);
  });
});

describe('flightDurationMs', () => {
  it('scales with distance and respects the minimum', () => {
    expect(flightDurationMs(10, 10, 100)).toBeCloseTo(1000);
    expect(flightDurationMs(0.1, 10, 120)).toBe(120);
  });
});
