import { describe, expect, it } from 'vitest';
import { MapData } from '../map/MapData';
import { TERRAIN } from '../map/TerrainTypes';
import { createBuilding } from './archetypes/building';
import { createVillager } from './archetypes/villager';
import { evictUnitsFrom } from './evict';
import { createEcsWorld } from './world';

function setup() {
  const world = createEcsWorld();
  const map = new MapData(32, 32, TERRAIN.grass);
  return { world, map };
}

describe('evictUnitsFrom', () => {
  it('gives every unit on the footprint a path to the nearest free tile outside it, and keeps its orders', () => {
    const { world, map } = setup();
    const centre = createVillager(world, { tile: { tx: 9, ty: 10 } });
    const corner = createVillager(world, { tile: { tx: 8, ty: 9 } });
    const outside = createVillager(world, { tile: { tx: 12, ty: 10 } });
    world.addComponent(centre, 'buildCommand', { targetId: 999 });
    createBuilding(world, { type: 'barracks', origin: { tx: 8, ty: 9 }, playerId: 1, mapData: map, underConstruction: true });
    evictUnitsFrom(world, map, { tx: 8, ty: 9 }, { width: 3, height: 3 });
    for (const v of [centre, corner]) {
      const end = v.movable!.path.at(-1)!;
      expect(map.isPassable(end.tx, end.ty)).toBe(true);
      expect(v.movable!.path.length).toBeLessThanOrEqual(2);
    }
    expect(centre.buildCommand).toEqual({ targetId: 999 });
    expect(outside.movable!.path).toEqual([]);
  });

  it('a unit walking across the footprint keeps its destination', () => {
    const { world, map } = setup();
    const v = createVillager(world, { tile: { tx: 9, ty: 10 } });
    v.movable!.path = [{ tx: 10, ty: 10 }, { tx: 11, ty: 10 }, { tx: 12, ty: 10 }, { tx: 13, ty: 10 }];
    createBuilding(world, { type: 'barracks', origin: { tx: 8, ty: 9 }, playerId: 1, mapData: map });
    evictUnitsFrom(world, map, { tx: 8, ty: 9 }, { width: 3, height: 3 });
    expect(v.movable!.path.at(-1)).toEqual({ tx: 13, ty: 10 });
  });

  it('leaves dying units alone', () => {
    const { world, map } = setup();
    const v = createVillager(world, { tile: { tx: 9, ty: 10 } });
    world.addComponent(v, 'dying', { ttlMs: 500 });
    createBuilding(world, { type: 'barracks', origin: { tx: 8, ty: 9 }, playerId: 1, mapData: map });
    evictUnitsFrom(world, map, { tx: 8, ty: 9 }, { width: 3, height: 3 });
    expect(v.movable!.path).toEqual([]);
  });
});
