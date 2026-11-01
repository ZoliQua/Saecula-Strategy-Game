import { describe, expect, it } from 'vitest';
import { isShoreSite } from '../../game/shore';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { findDockSite, landReachable } from './naval';

/** Land on the west (x < 20), sea on the east. */
function coast(): MapData {
  const map = new MapData(40, 40, TERRAIN.grass);
  for (let ty = 0; ty < 40; ty++) for (let tx = 20; tx < 40; tx++) map.setTile(tx, ty, TERRAIN.water);
  return map;
}

describe('naval decisions (M14)', () => {
  it('finds the nearest shore site for a dock on allowed (explored) tiles, none without water in reach', () => {
    const map = coast();
    const site = findDockSite(map, { tx: 10, ty: 10 }, 16, () => true)!;
    expect(isShoreSite(map, site, 3, 3)).toBe(true);
    expect(site.tx).toBe(17);
    expect(findDockSite(map, { tx: 10, ty: 10 }, 16, (tx) => tx < 15)).toBeNull();
    expect(findDockSite(map, { tx: 2, ty: 10 }, 8, () => true)).toBeNull();
  });

  it('tells whether a tile can be walked to from another (an island cannot)', () => {
    const map = coast();
    map.setTile(30, 30, TERRAIN.grass);
    expect(landReachable(map, { tx: 2, ty: 2 }, { tx: 18, ty: 35 })).toBe(true);
    expect(landReachable(map, { tx: 2, ty: 2 }, { tx: 30, ty: 30 })).toBe(false);
  });

  it('a walled-in enemy is still walkable (walls are breached), only water cuts the land off', () => {
    const map = coast();
    for (let t = 5; t <= 15; t++) {
      map.setBlocked(5, t, true);
      map.setBlocked(15, t, true);
      map.setBlocked(t, 5, true);
      map.setBlocked(t, 15, true);
    }
    expect(landReachable(map, { tx: 1, ty: 1 }, { tx: 10, ty: 10 })).toBe(true);
  });
});
