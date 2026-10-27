import { describe, expect, it } from 'vitest';
import { cliffFootDistance, needsOccluder, occluderReach, tilesInFrontOfFootprint, type CliffTest } from './cliffGeometry';

const REACH = occluderReach(58.6);

const only =
  (...tiles: Array<[number, number]>): CliffTest =>
  (tx, ty) =>
    tiles.some(([x, y]) => x === tx && y === ty);

describe('needsOccluder', () => {
  it('is false for non-cliff tiles and for cliffs with only cliff behind them', () => {
    const all: CliffTest = () => true;
    expect(needsOccluder(() => false, 10, 10, 5, 5, REACH)).toBe(false);
    expect(needsOccluder(all, 10, 10, 5, 5, REACH)).toBe(false);
  });

  it('is true when open ground lies within reach behind the block', () => {
    for (const [dx, dy] of [
      [-1, 0],
      [0, -1],
      [-1, -1],
      [-2, -1],
      [-1, -2],
      [-2, -2],
      [-3, -2],
      [-2, -3],
    ] as const) {
      const isCliff: CliffTest = (x, y) => !(x === 5 + dx && y === 5 + dy);
      expect(needsOccluder(isCliff, 10, 10, 5, 5, REACH)).toBe(true);
    }
  });

  it('ignores open ground in front of the block or out of reach', () => {
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [-3, 0],
      [-3, -3],
      [-3, -1],
      [-4, -2],
    ] as const) {
      const isCliff: CliffTest = (x, y) => !(x === 5 + dx && y === 5 + dy);
      expect(needsOccluder(isCliff, 10, 10, 5, 5, REACH)).toBe(false);
    }
  });

  it('treats the void beyond the map as nothing to hide', () => {
    expect(needsOccluder((x, y) => x >= 0 && y >= 0, 10, 10, 0, 0, REACH)).toBe(false);
  });
});

describe('occluderReach', () => {
  const sorted = (r: ReadonlyArray<readonly [number, number]>) => r.map(([a, b]) => `${a},${b}`).sort();

  it('reproduces the hand-derived reach for blocks up to 47 px', () => {
    expect(sorted(occluderReach(47))).toEqual(sorted([[-1, 0], [0, -1], [-1, -1], [-2, -1], [-1, -2], [-2, -2]]));
  });

  it('reaches one diagonal further for the 48 px cliff (≈ 59 px plateau tops)', () => {
    expect(sorted(occluderReach(58.6))).toEqual(sorted([[-1, 0], [0, -1], [-1, -1], [-2, -1], [-1, -2], [-2, -2], [-3, -2], [-2, -3]]));
  });
});

describe('cliffFootDistance', () => {
  it('measures from the face foot behind a ground point', () => {
    expect(cliffFootDistance(only([4, 5]), 5.1, 5)).toBeCloseTo(0.6);
    expect(cliffFootDistance(only([5, 4]), 5, 4.7)).toBeCloseTo(0.2);
    expect(cliffFootDistance(only([4, 4]), 4.8, 4.9)).toBeCloseTo(Math.hypot(0.3, 0.4));
  });

  it('is Infinity on a cliff tile or with no cliff behind', () => {
    expect(cliffFootDistance(only([5, 5]), 5, 5)).toBe(Infinity);
    expect(cliffFootDistance(only([6, 5]), 5, 5)).toBe(Infinity);
  });
});

describe('tilesInFrontOfFootprint', () => {
  const key = (t: readonly [number, number]) => `${t[0]},${t[1]}`;
  const tiles = new Set(tilesInFrontOfFootprint(10, 20, 3, 3).map(key));

  it('lists the tiles beside the +u and +v walls whose raised rock overlaps the building', () => {
    for (const t of [[13, 20], [13, 22], [14, 21], [10, 23], [12, 24], [13, 23]] as const) expect(tiles.has(key(t))).toBe(true);
  });

  it('skips the footprint, the tiles behind it and tiles off to the side', () => {
    for (const t of [[11, 21], [9, 21], [11, 19], [13, 19], [9, 23], [16, 20]] as const) expect(tiles.has(key(t))).toBe(false);
  });
});
