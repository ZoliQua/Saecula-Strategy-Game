import { describe, expect, it } from 'vitest';
import type { TileCoord } from '../iso/coordinates';
import { MapData } from './MapData';
import { findPath, findPathToAny, findPathToNearest } from './pathfinding';
import { TERRAIN } from './TerrainTypes';

/** A 32×32 grass map with a 3×3 block at (8,9) (a barracks foundation) around the start tile (9,10). */
function barracksOverStart(): MapData {
  const map = new MapData(32, 32, TERRAIN.grass);
  for (let y = 9; y < 12; y++) for (let x = 8; x < 11; x++) map.setBlocked(x, y, true);
  return map;
}

function stepsAreAdjacent(path: readonly TileCoord[]): boolean {
  return path.every((t, i) => i === 0 || Math.max(Math.abs(t.tx - path[i - 1]!.tx), Math.abs(t.ty - path[i - 1]!.ty)) === 1);
}

describe('pathfinding from blocked ground (escape)', () => {
  it('findPath leaves a 3×3 block from its centre tile and then follows a normal path', () => {
    const map = barracksOverStart();
    const path = findPath(map, { tx: 9, ty: 10 }, { tx: 20, ty: 20 });
    expect(path).not.toBeNull();
    expect(path![0]).toEqual({ tx: 9, ty: 10 });
    expect(path!.at(-1)).toEqual({ tx: 20, ty: 20 });
    expect(stepsAreAdjacent(path!)).toBe(true);
    // After the escape steps, every tile is passable.
    const firstFree = path!.findIndex((t) => map.isPassable(t.tx, t.ty));
    expect(firstFree).toBeGreaterThan(0);
    expect(path!.slice(firstFree).every((t) => map.isPassable(t.tx, t.ty))).toBe(true);
  });

  it('findPathToNearest escapes too, even toward a blocked goal', () => {
    const map = barracksOverStart();
    const path = findPathToNearest(map, { tx: 9, ty: 10 }, { tx: 25, ty: 10 });
    expect(path!.at(-1)).toEqual({ tx: 25, ty: 10 });
    map.setBlocked(25, 10, true);
    const near = findPathToNearest(map, { tx: 9, ty: 10 }, { tx: 25, ty: 10 })!.at(-1)!;
    expect(map.isPassable(near.tx, near.ty)).toBe(true);
  });

  it('when the goal is unreachable the escape steps alone still lead off the blocked ground', () => {
    const map = barracksOverStart();
    for (let i = 0; i < 32; i++) map.setBlocked(20, i, true);
    const path = findPath(map, { tx: 9, ty: 10 }, { tx: 25, ty: 10 });
    const end = path!.at(-1)!;
    expect(map.isPassable(end.tx, end.ty)).toBe(true);
  });

  it('a passable start whose only exits are diagonal corner cuts can step out', () => {
    const map = new MapData(32, 32, TERRAIN.grass);
    for (const [x, y] of [[9, 10], [11, 10], [10, 9], [10, 11]] as const) map.setBlocked(x, y, true);
    const path = findPath(map, { tx: 10, ty: 10 }, { tx: 20, ty: 20 });
    expect(path!.at(-1)).toEqual({ tx: 20, ty: 20 });
    expect(findPathToNearest(map, { tx: 10, ty: 10 }, { tx: 20, ty: 20 })!.at(-1)).toEqual({ tx: 20, ty: 20 });
  });

  it('a normal start is unchanged (no escape steps)', () => {
    const map = new MapData(16, 16, TERRAIN.grass);
    expect(findPath(map, { tx: 0, ty: 0 }, { tx: 3, ty: 0 })).toHaveLength(4);
  });
});

describe('findPathToAny', () => {
  it('walks to the nearest reachable tile that satisfies the goal test', () => {
    const map = new MapData(16, 16, TERRAIN.grass);
    for (let i = 0; i < 16; i++) if (i !== 3) map.setBlocked(8, i, true);
    const path = findPathToAny(map, { tx: 2, ty: 10 }, (tx, ty) => tx === 12 && ty === 10);
    expect(path![0]).toEqual({ tx: 2, ty: 10 });
    expect(path!.at(-1)).toEqual({ tx: 12, ty: 10 });
    expect(path!.some((t) => t.tx === 8 && t.ty === 3)).toBe(true);
    expect(stepsAreAdjacent(path!)).toBe(true);
  });

  it('returns null when no reachable tile qualifies', () => {
    const map = new MapData(16, 16, TERRAIN.grass);
    for (let i = 0; i < 16; i++) map.setBlocked(8, i, true);
    expect(findPathToAny(map, { tx: 2, ty: 10 }, (tx) => tx > 8)).toBeNull();
  });
});
