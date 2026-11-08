import { describe, expect, it } from 'vitest';
import type { TileCoord } from '../iso/coordinates';
import { MAP_TEMPLATES, TEMPLATE_GENERATORS } from './generator';
import { NEIGHBOUR_STEPS, reachMask } from './gridSteps';
import { MapData } from './MapData';
import { waterGrid } from './navGrid';
import { TERRAIN } from './TerrainTypes';
import { seaAt, waterBodies } from './waterBodies';

/** Whether seaAt(map, from) holds exactly the tiles the old flood (reachMask on the water layer) did. */
function sameAsFlood(map: MapData, from: TileCoord): boolean {
  const mask = reachMask(waterGrid(map), from);
  const sea = seaAt(map, from);
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) if ((mask[ty * map.width + tx] === 1) !== sea.has(tx, ty)) return false;
  }
  return true;
}

/** One start tile per water body, plus every blocked tile beside water (a fish school, a ship parked off the water). */
function probes(map: MapData): TileCoord[] {
  const labels = waterBodies(map);
  const seen = new Set<number>();
  const out: TileCoord[] = [];
  const water = waterGrid(map);
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      const id = labels[ty * map.width + tx]!;
      if (id !== 0 && !seen.has(id)) {
        seen.add(id);
        out.push({ tx, ty });
      } else if (id === 0 && map.getTile(tx, ty) === TERRAIN.fish) {
        if (NEIGHBOUR_STEPS.some(([dx, dy]) => water.isPassable(tx + dx, ty + dy))) out.push({ tx, ty });
      }
    }
  }
  return out;
}

describe('waterBodies (M14)', () => {
  it.each(MAP_TEMPLATES)('labels match the water flood on the %s template', (template) => {
    for (const [size, players, seed] of [[64, 2, 1], [96, 4, 2], [128, 6, 3]] as const) {
      const { map } = TEMPLATE_GENERATORS[template]({ width: size, height: size, seed, playerCount: players });
      const ps = probes(map);
      for (const p of ps) expect(sameAsFlood(map, p), `${template} ${size} seed ${seed} from ${p.tx},${p.ty}`).toBe(true);
    }
  });

  it('two seas joined only diagonally past a blocked corner stay apart, as a ship cannot cut it', () => {
    const map = new MapData(6, 6, TERRAIN.grass);
    map.setTile(1, 1, TERRAIN.water);
    map.setTile(2, 2, TERRAIN.water);
    expect(seaAt(map, { tx: 1, ty: 1 }).has(2, 2)).toBe(false);
    expect(sameAsFlood(map, { tx: 1, ty: 1 })).toBe(true);
  });

  it('is computed once per map and rebuilt only when open water changes', () => {
    // Two seas split by a fish school in a one-tile strait.
    const map = new MapData(9, 3, TERRAIN.grass);
    for (let tx = 0; tx < 9; tx++) map.setTile(tx, 1, TERRAIN.water);
    map.setTile(4, 1, TERRAIN.fish);
    const first = waterBodies(map);
    expect(waterBodies(map)).toBe(first);
    expect(seaAt(map, { tx: 0, ty: 1 }).has(8, 1)).toBe(false);
    // Land changes (a building on grass) keep the labels.
    map.setBlocked(0, 0, true);
    map.setTile(1, 0, TERRAIN.forest);
    expect(waterBodies(map)).toBe(first);
    // The school fished out (its tile turns to water): the two seas join.
    map.setTile(4, 1, TERRAIN.water);
    expect(seaAt(map, { tx: 0, ty: 1 }).has(8, 1)).toBe(true);
    // A blocked water tile splits them again.
    map.setBlocked(4, 1, true);
    expect(seaAt(map, { tx: 0, ty: 1 }).has(8, 1)).toBe(false);
    expect(sameAsFlood(map, { tx: 0, ty: 1 })).toBe(true);
    // From the blocked tile itself: both seas beside it, as the flood seeds them.
    expect(sameAsFlood(map, { tx: 4, ty: 1 })).toBe(true);
    expect(seaAt(map, { tx: 4, ty: 1 }).has(0, 1)).toBe(true);
    expect(seaAt(map, { tx: 4, ty: 1 }).has(8, 1)).toBe(true);
  });
});
