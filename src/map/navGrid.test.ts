import { describe, expect, it } from 'vitest';
import { MapData } from './MapData';
import { waterGrid } from './navGrid';
import { findPath, findPathToNearest } from './pathfinding';
import { TERRAIN } from './TerrainTypes';

/** A 20×20 map: grass, with a water lake at x 5..14, y 5..14. */
function lakeMap(): MapData {
  const map = new MapData(20, 20, TERRAIN.grass);
  for (let ty = 5; ty <= 14; ty++) for (let tx = 5; tx <= 14; tx++) map.setTile(tx, ty, TERRAIN.water);
  return map;
}

describe('waterGrid (M14 water layer)', () => {
  it('is passable on open water only: not on land, not off the map, not where blocked', () => {
    const map = lakeMap();
    const water = waterGrid(map);
    expect(water.width).toBe(20);
    expect(water.height).toBe(20);
    expect(water.isPassable(7, 7)).toBe(true);
    expect(water.isPassable(2, 2)).toBe(false);
    expect(water.isPassable(-1, 7)).toBe(false);
    map.setBlocked(8, 8, true);
    expect(water.isPassable(8, 8)).toBe(false);
  });

  it('is one view per map (cached), reading the map live', () => {
    const map = lakeMap();
    expect(waterGrid(map)).toBe(waterGrid(map));
    map.setTile(2, 2, TERRAIN.water);
    expect(waterGrid(map).isPassable(2, 2)).toBe(true);
  });

  it('the path searches walk a ship on water and a land unit on land', () => {
    const map = lakeMap();
    const water = waterGrid(map);
    const ship = findPath(water, { tx: 5, ty: 5 }, { tx: 14, ty: 14 });
    expect(ship?.every((t) => water.isPassable(t.tx, t.ty))).toBe(true);
    // A ship sent ashore stops on the nearest water tile.
    expect(findPathToNearest(water, { tx: 6, ty: 6 }, { tx: 18, ty: 6 })?.at(-1)).toEqual({ tx: 14, ty: 6 });
    // A land unit goes round the lake.
    const walker = findPath(map, { tx: 2, ty: 10 }, { tx: 17, ty: 10 });
    expect(walker?.every((t) => map.isPassable(t.tx, t.ty))).toBe(true);
  });
});
