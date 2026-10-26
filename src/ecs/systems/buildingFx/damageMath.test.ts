import { describe, expect, it } from 'vitest';
import {
  collapseHeightScale,
  collapsePose,
  collapseProgress,
  damageStage,
  fireAnchors,
  isStrike,
  nearestIndices,
  rubbleAlpha,
} from './damageMath';

describe('damageStage', () => {
  it('is intact above the smoke threshold, smoking below it, burning below the fire threshold', () => {
    expect(damageStage(100, 100, 0.66, 0.33)).toBe(0);
    expect(damageStage(66, 100, 0.66, 0.33)).toBe(0);
    expect(damageStage(65, 100, 0.66, 0.33)).toBe(1);
    expect(damageStage(33, 100, 0.66, 0.33)).toBe(1);
    expect(damageStage(32, 100, 0.66, 0.33)).toBe(2);
    expect(damageStage(1, 100, 0.66, 0.33)).toBe(2);
  });

  it('shows nothing for dead or degenerate health', () => {
    expect(damageStage(0, 100, 0.66, 0.33)).toBe(0);
    expect(damageStage(5, 0, 0.66, 0.33)).toBe(0);
  });
});

describe('fireAnchors', () => {
  // A box on a 2x2 footprint: four eave corners at z 40 and a ridge apex at z 70.
  const volume = [
    { gx: 100, gy: 200, z: 0 },
    { gx: 36, gy: 168, z: 40 },
    { gx: 164, gy: 168, z: 40 },
    { gx: 100, gy: 136, z: 40 },
    { gx: 100, gy: 200, z: 40 },
    { gx: 100, gy: 168, z: 70 },
  ];

  it('starts at the highest point and converts texture px to world px from the anchor', () => {
    const [first] = fireAnchors(volume, 100, 200, 2, 1, [0, -20]);
    // Apex top (100, 98) is 102 texture px above the anchor; pulled 30% towards the pool centre.
    expect(first![0]).toBeCloseTo(0, 5);
    expect(first![1]).toBeLessThan(-40);
  });

  it('spreads several flames apart over the top of the volume', () => {
    const pts = fireAnchors(volume, 100, 200, 2, 3, [0, -20]);
    expect(pts).toHaveLength(3);
    const d = Math.hypot(pts[0]![0] - pts[1]![0], pts[0]![1] - pts[1]![1]);
    expect(d).toBeGreaterThan(10);
  });

  it('falls back when the art has no volume', () => {
    expect(fireAnchors([], 0, 0, 2, 2, [0, -20])).toEqual([[0, -20]]);
    expect(fireAnchors(volume, 100, 200, 2, 0, [0, -20])).toEqual([]);
  });
});

describe('collapsePose', () => {
  it('starts standing, sinks monotonically and is gone at the end', () => {
    const start = collapsePose(0, 1);
    expect(start.sink).toBe(0);
    expect(start.alpha).toBe(1);
    let prev = -1;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const s = collapsePose(t, 1).sink;
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
    const end = collapsePose(1, -1);
    expect(end.alpha).toBe(0);
    expect(end.sink).toBeGreaterThan(0.8);
    expect(end.rotation).toBeLessThan(0);
  });

  it('only shudders at the start', () => {
    expect(Math.abs(collapsePose(0.05, 1).dx)).toBeGreaterThan(0);
    expect(collapsePose(0.5, 1).dx).toBe(0);
  });

  it('maps the dying timer to progress and shrinks the shadow with the sink', () => {
    expect(collapseProgress(2400, 2400)).toBe(0);
    expect(collapseProgress(600, 2400)).toBeCloseTo(0.75);
    expect(collapseProgress(-10, 2400)).toBe(1);
    expect(collapseHeightScale(2400, 2400)).toBe(1);
    expect(collapseHeightScale(0, 2400)).toBeLessThan(0.2);
  });
});

describe('rubbleAlpha', () => {
  it('fades in during the collapse, holds, then fades out over its life', () => {
    expect(rubbleAlpha(0, 2000, 30_000, 0.4)).toBe(0);
    expect(rubbleAlpha(1000, 2000, 30_000, 0.4)).toBeGreaterThan(0);
    expect(rubbleAlpha(1999, 2000, 30_000, 0.4)).toBe(1);
    expect(rubbleAlpha(2000 + 10_000, 2000, 30_000, 0.4)).toBe(1);
    const late = rubbleAlpha(2000 + 25_000, 2000, 30_000, 0.4);
    expect(late).toBeGreaterThan(0);
    expect(late).toBeLessThan(0.5);
    expect(rubbleAlpha(2000 + 30_000, 2000, 30_000, 0.4)).toBe(0);
  });
});

describe('isStrike', () => {
  it('fires once when the swing enters the striking frame', () => {
    expect(isStrike(1, 2, 2)).toBe(true);
    expect(isStrike(undefined, 2, 2)).toBe(true);
    expect(isStrike(2, 2, 2)).toBe(false);
    expect(isStrike(2, 3, 2)).toBe(false);
  });
});

describe('nearestIndices', () => {
  it('keeps the nearest points up to the cap', () => {
    const pts = [{ x: 100, y: 0 }, { x: 5, y: 0 }, { x: 50, y: 0 }];
    expect([...nearestIndices(pts, 0, 0, 2)].sort()).toEqual([1, 2]);
    expect(nearestIndices(pts, 0, 0, 0).size).toBe(0);
    expect(nearestIndices(pts, 0, 0, 9).size).toBe(3);
  });
});
