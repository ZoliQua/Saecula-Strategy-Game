import { describe, expect, it } from 'vitest';
import { MapData } from './MapData';
import { TERRAIN } from './TerrainTypes';

describe('MapData', () => {
  it('initializes with grass everywhere', () => {
    const map = new MapData(8, 8);
    map.forEachTile((_, terrain) => {
      expect(terrain).toBe(TERRAIN.grass);
    });
  });

  it('supports setTile / getTile', () => {
    const map = new MapData(8, 8);
    map.setTile(3, 4, TERRAIN.forest);
    expect(map.getTile(3, 4)).toBe(TERRAIN.forest);
    expect(map.getTile(0, 0)).toBe(TERRAIN.grass);
  });

  it('throws for out-of-bounds access', () => {
    const map = new MapData(8, 8);
    expect(() => map.getTile(-1, 0)).toThrow();
    expect(() => map.getTile(8, 0)).toThrow();
    expect(() => map.setTile(0, 8, TERRAIN.forest)).toThrow();
  });

  it('isPassable: grass yes, forest no, water no, berries yes', () => {
    const map = new MapData(4, 4);
    map.setTile(0, 0, TERRAIN.grass);
    map.setTile(1, 0, TERRAIN.forest);
    map.setTile(2, 0, TERRAIN.water);
    map.setTile(3, 0, TERRAIN.berries);
    expect(map.isPassable(0, 0)).toBe(true);
    expect(map.isPassable(1, 0)).toBe(false);
    expect(map.isPassable(2, 0)).toBe(false);
    expect(map.isPassable(3, 0)).toBe(true);
  });

  it('isBuildable: only free grass (berry bushes are walkable but never built over)', () => {
    const map = new MapData(8, 8);
    map.setTile(1, 1, TERRAIN.berries);
    map.setTile(2, 2, TERRAIN.forest);
    map.setBlocked(3, 3, true);
    expect(map.isBuildable(0, 0)).toBe(true);
    expect(map.isBuildable(1, 1)).toBe(false);
    expect(map.isPassable(1, 1)).toBe(true);
    expect(map.isBuildable(2, 2)).toBe(false);
    expect(map.isBuildable(3, 3)).toBe(false);
    expect(map.isBuildable(-1, 0)).toBe(false);
  });

  it('isPassable returns false for out-of-bounds', () => {
    const map = new MapData(4, 4);
    expect(map.isPassable(-1, 0)).toBe(false);
    expect(map.isPassable(0, 4)).toBe(false);
  });

  it('forEachTile visits each tile exactly once', () => {
    const map = new MapData(3, 3);
    let count = 0;
    const seen = new Set<string>();
    map.forEachTile((tile) => {
      count++;
      seen.add(`${tile.tx},${tile.ty}`);
    });
    expect(count).toBe(9);
    expect(seen.size).toBe(9);
  });

  it('getRawTiles reflects setTile changes', () => {
    const map = new MapData(2, 2);
    map.setTile(1, 1, TERRAIN.gold_mine);
    const raw = map.getRawTiles();
    expect(raw[3]).toBe(TERRAIN.gold_mine);
  });
});
