import { describe, expect, it } from 'vitest';
import { MapData } from './MapData';
import { findPath, findPathToNearest } from './pathfinding';
import { TERRAIN } from './TerrainTypes';

function grass(w: number, h: number): MapData {
  return new MapData(w, h, TERRAIN.grass);
}

describe('findPath', () => {
  it('returns a single-tile path when start equals goal', () => {
    const path = findPath(grass(5, 5), { tx: 2, ty: 2 }, { tx: 2, ty: 2 });
    expect(path).toEqual([{ tx: 2, ty: 2 }]);
  });

  it('finds a straight path on empty grass', () => {
    const path = findPath(grass(10, 10), { tx: 0, ty: 0 }, { tx: 4, ty: 0 });
    expect(path).not.toBeNull();
    expect(path![0]).toEqual({ tx: 0, ty: 0 });
    expect(path!.at(-1)).toEqual({ tx: 4, ty: 0 });
  });

  it('diagonal path on empty grass', () => {
    const path = findPath(grass(10, 10), { tx: 0, ty: 0 }, { tx: 3, ty: 3 });
    expect(path).not.toBeNull();
    expect(path!.at(-1)).toEqual({ tx: 3, ty: 3 });
    // With diagonal movement, optimal length is 4 tiles (including start).
    expect(path!.length).toBeLessThanOrEqual(4);
  });

  it('routes around a forest wall', () => {
    const map = grass(10, 10);
    for (let ty = 0; ty < 9; ty++) {
      map.setTile(5, ty, TERRAIN.forest);
    }
    const path = findPath(map, { tx: 0, ty: 0 }, { tx: 9, ty: 0 });
    expect(path).not.toBeNull();
    // Must go around the wall (which has a gap at ty=9).
    const maxTy = Math.max(...path!.map((t) => t.ty));
    expect(maxTy).toBeGreaterThan(0);
  });

  it('returns null when goal is enclosed', () => {
    const map = grass(5, 5);
    for (const [tx, ty] of [
      [1, 2],
      [3, 2],
      [2, 1],
      [2, 3],
    ] as const) {
      map.setTile(tx, ty, TERRAIN.forest);
    }
    const path = findPath(map, { tx: 0, ty: 0 }, { tx: 2, ty: 2 });
    expect(path).toBeNull();
  });

  it('accepts an impassable goal but produces a path ending on it', () => {
    const map = grass(5, 5);
    map.setTile(3, 3, TERRAIN.gold_mine);
    const path = findPath(map, { tx: 0, ty: 0 }, { tx: 3, ty: 3 });
    expect(path).not.toBeNull();
    expect(path!.at(-1)).toEqual({ tx: 3, ty: 3 });
  });

  it('rejects no path on a fully walled map', () => {
    const map = grass(5, 5);
    for (let tx = 0; tx < 5; tx++) map.setTile(tx, 2, TERRAIN.forest);
    const path = findPath(map, { tx: 0, ty: 0 }, { tx: 0, ty: 4 });
    expect(path).toBeNull();
  });

  it('handles adjacent tiles', () => {
    const path = findPath(grass(5, 5), { tx: 2, ty: 2 }, { tx: 3, ty: 2 });
    expect(path).not.toBeNull();
    expect(path).toEqual([
      { tx: 2, ty: 2 },
      { tx: 3, ty: 2 },
    ]);
  });

  it('path steps are all adjacent (chebyshev distance 1)', () => {
    const path = findPath(grass(20, 20), { tx: 1, ty: 1 }, { tx: 15, ty: 10 });
    expect(path).not.toBeNull();
    for (let i = 1; i < path!.length; i++) {
      const a = path![i - 1]!;
      const b = path![i]!;
      const cheb = Math.max(Math.abs(a.tx - b.tx), Math.abs(a.ty - b.ty));
      expect(cheb).toBe(1);
    }
  });

  it('path does not pass through forest', () => {
    const map = grass(10, 10);
    for (let ty = 2; ty < 8; ty++) map.setTile(4, ty, TERRAIN.forest);
    const path = findPath(map, { tx: 0, ty: 5 }, { tx: 9, ty: 5 });
    expect(path).not.toBeNull();
    for (const step of path!) {
      if (step.tx === 4 && step.ty >= 2 && step.ty < 8) {
        throw new Error('path crossed a forest tile');
      }
    }
  });
});

describe('findPathToNearest', () => {
  function ring(): MapData {
    const map = grass(12, 12);
    for (let i = 4; i <= 8; i++) {
      for (const [x, y] of [[i, 4], [i, 8], [4, i], [8, i]] as const) map.setBlocked(x, y, true);
    }
    return map;
  }

  it('walls block a direct path across them', () => {
    const map = grass(9, 9);
    for (let ty = 0; ty < 9; ty++) map.setBlocked(4, ty, true);
    expect(findPath(map, { tx: 0, ty: 4 }, { tx: 8, ty: 4 })).toBeNull();
  });

  it('routes around a wall that has a gap', () => {
    const map = grass(9, 9);
    for (let ty = 0; ty < 8; ty++) map.setBlocked(4, ty, true);
    const path = findPathToNearest(map, { tx: 0, ty: 4 }, { tx: 8, ty: 4 });
    expect(path!.at(-1)).toEqual({ tx: 8, ty: 4 });
    expect(Math.max(...path!.map((t) => t.ty))).toBe(8);
  });

  it('stops at the nearest reachable tile when the goal is inside a wall ring', () => {
    const map = ring();
    const path = findPathToNearest(map, { tx: 0, ty: 6 }, { tx: 6, ty: 6 });
    expect(path).not.toBeNull();
    expect(path!.at(-1)).toEqual({ tx: 3, ty: 6 });
  });

  it('goes next to a blocked goal tile rather than onto it', () => {
    const map = grass(8, 8);
    map.setBlocked(5, 4, true);
    const end = findPathToNearest(map, { tx: 0, ty: 4 }, { tx: 5, ty: 4 })!.at(-1)!;
    expect(map.isPassable(end.tx, end.ty)).toBe(true);
    expect(Math.max(Math.abs(end.tx - 5), Math.abs(end.ty - 4))).toBe(1);
  });

  it('returns null when the unit is already as close as it can get', () => {
    const map = ring();
    expect(findPathToNearest(map, { tx: 3, ty: 6 }, { tx: 6, ty: 6 })).toBeNull();
  });
});
