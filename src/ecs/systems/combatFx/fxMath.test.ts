import { describe, expect, it } from 'vitest';
import { tileToScreen } from '../../../iso/coordinates';
import { decalAlpha, frameAt, shakeIntensity, shotPose } from './fxMath';

describe('shotPose', () => {
  const from = { x: 2, y: 2 };
  const to = { x: 8, y: 2 };

  it('leaves from the launch lift and lands at the impact lift', () => {
    const a = shotPose(from, to, 0, 1, 18, 6);
    const ga = tileToScreen({ tx: 2, ty: 2 });
    expect(a.gx).toBeCloseTo(ga.sx);
    expect(a.gy).toBeCloseTo(ga.sy);
    expect(a.lift).toBeCloseTo(18);
    expect(a.sy).toBeCloseTo(ga.sy - 18);
    const b = shotPose(from, to, 1, 1, 18, 6);
    expect(b.lift).toBeCloseTo(6);
  });

  it('rises then falls, tangent pointing up early and down late (screen y down)', () => {
    // Screen-horizontal shot (tx up, ty down by the same amount).
    const a = { x: 2, y: 8 };
    const b = { x: 8, y: 2 };
    const early = shotPose(a, b, 0.1, 1, 18, 6);
    const mid = shotPose(a, b, 0.5, 1, 18, 6);
    const late = shotPose(a, b, 0.9, 1, 18, 6);
    expect(mid.lift).toBeGreaterThan(early.lift);
    expect(mid.lift).toBeGreaterThan(late.lift);
    expect(Math.sin(early.angle)).toBeLessThan(0);
    expect(Math.sin(late.angle)).toBeGreaterThan(0);
  });

  it('a flat shot points along the ground direction', () => {
    const p = shotPose(from, to, 0.5, 0, 10, 10);
    const a = tileToScreen({ tx: 2, ty: 2 });
    const b = tileToScreen({ tx: 8, ty: 2 });
    expect(p.angle).toBeCloseTo(Math.atan2(b.sy - a.sy, b.sx - a.sx), 3);
  });
});

describe('shakeIntensity', () => {
  it('is strongest at the view centre and weaker at the edge', () => {
    const c = shakeIntensity(0, 0, 500, 300, 0.01, 0.35);
    const e = shakeIntensity(490, 0, 500, 300, 0.01, 0.35);
    expect(c).toBeCloseTo(0.01);
    expect(e).toBeLessThan(c);
    expect(e).toBeGreaterThan(0.003);
  });

  it('is zero off screen', () => {
    expect(shakeIntensity(520, 0, 500, 300, 0.01, 0.35)).toBe(0);
    expect(shakeIntensity(0, -310, 500, 300, 0.01, 0.35)).toBe(0);
  });
});

describe('decalAlpha', () => {
  it('holds, then fades to zero by the end of its life', () => {
    expect(decalAlpha(0, 20_000, 0.35)).toBe(1);
    expect(decalAlpha(6_000, 20_000, 0.35)).toBe(1);
    const m = decalAlpha(13_000, 20_000, 0.35);
    expect(m).toBeGreaterThan(0);
    expect(m).toBeLessThan(1);
    expect(decalAlpha(20_000, 20_000, 0.35)).toBe(0);
    expect(decalAlpha(25_000, 20_000, 0.35)).toBe(0);
  });

  it('fades monotonically', () => {
    let prev = 1;
    for (let t = 0; t <= 20_000; t += 500) {
      const a = decalAlpha(t, 20_000, 0.35);
      expect(a).toBeLessThanOrEqual(prev);
      prev = a;
    }
  });
});

describe('frameAt', () => {
  it('steps through the frames and reports -1 once done', () => {
    expect(frameAt(0, 70, 9)).toBe(0);
    expect(frameAt(69, 70, 9)).toBe(0);
    expect(frameAt(70, 70, 9)).toBe(1);
    expect(frameAt(70 * 8 + 5, 70, 9)).toBe(8);
    expect(frameAt(70 * 9, 70, 9)).toBe(-1);
  });
});
