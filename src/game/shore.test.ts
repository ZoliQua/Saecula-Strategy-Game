import { describe, expect, it } from 'vitest';
import { MapData } from '../map/MapData';
import { TERRAIN } from '../map/TerrainTypes';
import { isShoreSite, shoreWaterTiles } from './shore';

/** Land on the west (x < 10), sea on the east. */
function coast(): MapData {
  const map = new MapData(20, 20, TERRAIN.grass);
  for (let ty = 0; ty < 20; ty++) for (let tx = 10; tx < 20; tx++) map.setTile(tx, ty, TERRAIN.water);
  return map;
}

describe('dock shore rule (M14)', () => {
  it('a dock needs a side touching open water (at least two tiles of it)', () => {
    const map = coast();
    expect(isShoreSite(map, { tx: 7, ty: 5 }, 3, 3)).toBe(true);
    expect(isShoreSite(map, { tx: 3, ty: 5 }, 3, 3)).toBe(false);
    // Corners only do not count: a ship could not come alongside.
    map.setTile(10, 4, TERRAIN.grass);
    for (let ty = 5; ty <= 7; ty++) map.setTile(10, ty, TERRAIN.grass);
    map.setTile(10, 8, TERRAIN.grass);
    expect(isShoreSite(map, { tx: 7, ty: 5 }, 3, 3)).toBe(false);
  });

  it('lists the water tiles alongside a footprint (where its ships launch)', () => {
    const map = coast();
    expect(shoreWaterTiles(map, { tx: 7, ty: 5 }, 3, 3)).toEqual([
      { tx: 10, ty: 5 },
      { tx: 10, ty: 6 },
      { tx: 10, ty: 7 },
    ]);
  });
});
