import { describe, expect, it } from 'vitest';
import { tileToScreen } from '../iso/coordinates';
import { buildRelief } from './cliffRelief';
import { RockFootprintIndex, rockFootprints } from './rockFootprints';

/** A 3×3 plateau in the middle of an 8×8 map. */
const isCliff = (tx: number, ty: number) => tx >= 3 && tx <= 5 && ty >= 3 && ty <= 5;

function inside(poly: ReadonlyArray<readonly [number, number]>, x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

describe('rockFootprints', () => {
  const relief = buildRelief(isCliff, 8, 8, 40, 7);
  const prints = rockFootprints(relief);

  it('outlines only cliff tiles that carry rock', () => {
    expect(prints.length).toBeGreaterThan(0);
    expect(prints.length).toBeLessThanOrEqual(9);
    for (const p of prints) expect(isCliff(p.tx, p.ty)).toBe(true);
  });

  it("covers the plateau's raised top and the ground under it, not open ground in front", () => {
    const centre = tileToScreen({ tx: 4, ty: 4 });
    const covered = (x: number, y: number) => prints.some((p) => inside(p.points, x, y));
    // The centre tile's top is drawn ~40 px above its ground point.
    expect(covered(centre.sx, centre.sy - 30)).toBe(true);
    expect(covered(centre.sx, centre.sy)).toBe(true);
    // Open ground two tiles in front of the plateau.
    const front = tileToScreen({ tx: 7, ty: 7 });
    expect(covered(front.sx, front.sy)).toBe(false);
  });

  it('keeps screen bounds for a cheap overlap test', () => {
    for (const p of prints) {
      for (const [x, y] of p.points) {
        expect(x).toBeGreaterThanOrEqual(p.minX);
        expect(x).toBeLessThanOrEqual(p.maxX);
        expect(y).toBeGreaterThanOrEqual(p.minY);
        expect(y).toBeLessThanOrEqual(p.maxY);
      }
    }
  });

  it('finds the footprints overlapping a screen box', () => {
    const centre = tileToScreen({ tx: 4, ty: 4 });
    const index = new RockFootprintIndex(prints, 64);
    const near = index.near({ minX: centre.sx - 4, minY: centre.sy - 4, maxX: centre.sx + 4, maxY: centre.sy + 4 });
    expect(near.length).toBeGreaterThan(0);
    expect(new Set(near).size).toBe(near.length);
    const far = tileToScreen({ tx: 0, ty: 7 });
    expect(index.near({ minX: far.sx - 4, minY: far.sy - 4, maxX: far.sx + 4, maxY: far.sy + 4 })).toEqual([]);
    expect(new RockFootprintIndex([]).empty).toBe(true);
  });

  it('is empty without cliffs', () => {
    expect(rockFootprints(buildRelief(() => false, 4, 4, 40))).toEqual([]);
  });
});
