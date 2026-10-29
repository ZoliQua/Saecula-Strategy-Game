import { describe, expect, it } from 'vitest';
import type { TileCoord } from '../iso/coordinates';
import { MapData } from './MapData';
import { escapeSteps, type EscapeRules } from './escape';
import { findPath, findPathToAny, findPathToNearest } from './pathfinding';
import { TERRAIN } from './TerrainTypes';

/** A 32×32 grass map with a 3×3 block at (8,9) (a barracks foundation) around the start tile (9,10). */
function barracksOverStart(): MapData {
  const map = new MapData(32, 32, TERRAIN.grass);
  for (let y = 9; y < 12; y++) for (let x = 8; x < 11; x++) map.setBlocked(x, y, true);
  return map;
}

/** The barracks block may be crossed (the structure the unit stands on). */
const BARRACKS: EscapeRules = { crossable: (tx, ty) => tx >= 8 && tx < 11 && ty >= 9 && ty < 12, cuttable: () => true };

function stepsAreAdjacent(path: readonly TileCoord[]): boolean {
  return path.every((t, i) => i === 0 || Math.max(Math.abs(t.tx - path[i - 1]!.tx), Math.abs(t.ty - path[i - 1]!.ty)) === 1);
}

describe('pathfinding from blocked ground (escape)', () => {
  it('findPath leaves a 3×3 block from its centre tile and then follows a normal path', () => {
    const map = barracksOverStart();
    const path = findPath(map, { tx: 9, ty: 10 }, { tx: 20, ty: 20 }, BARRACKS);
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
    const path = findPathToNearest(map, { tx: 9, ty: 10 }, { tx: 25, ty: 10 }, BARRACKS);
    expect(path!.at(-1)).toEqual({ tx: 25, ty: 10 });
    map.setBlocked(25, 10, true);
    const near = findPathToNearest(map, { tx: 9, ty: 10 }, { tx: 25, ty: 10 }, BARRACKS)!.at(-1)!;
    expect(map.isPassable(near.tx, near.ty)).toBe(true);
  });

  it('when the goal is unreachable the escape steps alone still lead off the blocked ground', () => {
    const map = barracksOverStart();
    for (let i = 0; i < 32; i++) map.setBlocked(20, i, true);
    const path = findPath(map, { tx: 9, ty: 10 }, { tx: 25, ty: 10 }, BARRACKS);
    const end = path!.at(-1)!;
    expect(map.isPassable(end.tx, end.ty)).toBe(true);
  });

  it('a passable start whose only exits are diagonal corner cuts can step out', () => {
    const map = new MapData(32, 32, TERRAIN.grass);
    for (const [x, y] of [[9, 10], [11, 10], [10, 9], [10, 11]] as const) map.setBlocked(x, y, true);
    const open: EscapeRules = { crossable: () => false, cuttable: () => true };
    const path = findPath(map, { tx: 10, ty: 10 }, { tx: 20, ty: 20 }, open);
    expect(path!.at(-1)).toEqual({ tx: 20, ty: 20 });
    expect(findPathToNearest(map, { tx: 10, ty: 10 }, { tx: 20, ty: 20 }, open)!.at(-1)).toEqual({ tx: 20, ty: 20 });
    // Corners that are wall segments are never cut (the default rules cut nothing).
    expect(escapeSteps(map, { tx: 10, ty: 10 })).toBeNull();
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

describe('escape never crosses another structure (fix round 1)', () => {
  /** Review probe: an enemy wall line along ty=11, own houses at (3,9) and (8,9), a barracks at (5,8) over a unit at (6,10). */
  function probe(): { map: MapData; barracks: EscapeRules } {
    const map = new MapData(20, 20, TERRAIN.grass);
    const block = (x0: number, y0: number, w: number, h: number) => {
      for (let x = x0; x < x0 + w; x++) for (let y = y0; y < y0 + h; y++) map.setBlocked(x, y, true);
    };
    block(0, 11, 20, 1);
    block(3, 9, 2, 2);
    block(8, 9, 2, 2);
    block(5, 8, 3, 3);
    const barracks: EscapeRules = { crossable: (tx, ty) => tx >= 5 && tx < 8 && ty >= 8 && ty < 11, cuttable: () => false };
    return { map, barracks };
  }

  it('the escape leaves through the barracks ring, never through the wall or the houses', () => {
    const { map, barracks } = probe();
    const steps = escapeSteps(map, { tx: 6, ty: 10 }, barracks)!;
    expect(steps.at(-1)!.ty).toBeLessThan(8);
    expect(steps.every((t) => t.ty < 11)).toBe(true);
    expect(steps.slice(1, -1).every((t) => barracks.crossable(t.tx, t.ty))).toBe(true);
    const path = findPath(map, { tx: 6, ty: 10 }, { tx: 6, ty: 3 }, barracks)!;
    expect(path.at(-1)).toEqual({ tx: 6, ty: 3 });
    expect(path.every((t) => t.ty < 11)).toBe(true);
  });

  it('with the default rules a unit cannot cross blocked ground beyond its own tile', () => {
    const { map } = probe();
    expect(escapeSteps(map, { tx: 6, ty: 10 })).toBeNull();
    // From a footprint's edge tile it may step straight out.
    expect(escapeSteps(map, { tx: 6, ty: 8 })!.at(-1)!.ty).toBe(7);
  });

  it('prefers an exit from which the goal can be reached', () => {
    const map = new MapData(20, 20, TERRAIN.grass);
    for (let x = 0; x < 20; x++) map.setBlocked(x, 10, true); // a wall line through the middle of a 3×3 block
    for (let x = 5; x < 8; x++) for (let y = 9; y < 12; y++) map.setBlocked(x, y, true);
    const block: EscapeRules = { crossable: (tx, ty) => tx >= 5 && tx < 8 && ty >= 9 && ty < 12, cuttable: () => false };
    expect(escapeSteps(map, { tx: 6, ty: 10 }, block, { tx: 6, ty: 18 })!.at(-1)!.ty).toBe(12);
    expect(escapeSteps(map, { tx: 6, ty: 10 }, block, { tx: 6, ty: 2 })!.at(-1)!.ty).toBe(8);
  });
});
