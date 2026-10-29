import { describe, expect, it } from 'vitest';
import { MapData } from '../map/MapData';
import { TERRAIN } from '../map/TerrainTypes';
import { createBuilding } from './archetypes/building';
import { createVillager } from './archetypes/villager';
import { createWall } from './archetypes/wall';
import { evictUnitsFrom } from './evict';
import { onFootprintRing } from './footprint';
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

describe('evictUnitsFrom never sends a unit through another structure (fix round 1)', () => {
  /** Review probe: an enemy wall along ty=11, own houses at (3,9) and (8,9), own TC at (5,2), a barracks laid at (5,8) over a unit at (6,10). */
  function probe() {
    const world = createEcsWorld();
    const map = new MapData(20, 20, TERRAIN.grass);
    for (let x = 0; x < 20; x++) createWall(world, { tile: { tx: x, ty: 11 }, playerId: 2, mapData: map });
    createBuilding(world, { type: 'house', origin: { tx: 3, ty: 9 }, playerId: 1, mapData: map });
    createBuilding(world, { type: 'house', origin: { tx: 8, ty: 9 }, playerId: 1, mapData: map });
    const tc = createBuilding(world, { type: 'town_center', origin: { tx: 5, ty: 2 }, playerId: 1, mapData: map });
    return { world, map, tc };
  }
  const place = (world: ReturnType<typeof createEcsWorld>, map: MapData) => {
    createBuilding(world, { type: 'barracks', origin: { tx: 5, ty: 8 }, playerId: 1, mapData: map, underConstruction: true });
    evictUnitsFrom(world, map, { tx: 5, ty: 8 }, { width: 3, height: 3 });
  };

  it('a walking unit leaves through the barracks ring toward its destination, not through the wall', () => {
    const { world, map } = probe();
    const v = createVillager(world, { tile: { tx: 6, ty: 10 } });
    v.movable!.path = [{ tx: 6, ty: 9 }, { tx: 6, ty: 8 }, { tx: 6, ty: 7 }, { tx: 6, ty: 6 }];
    place(world, map);
    const path = v.movable!.path;
    expect(path.at(-1)).toEqual({ tx: 6, ty: 6 });
    expect(path.every((t) => t.ty < 11)).toBe(true);
    const out = path.findIndex((t) => t.ty < 8);
    expect(path.slice(out).every((t) => map.isPassable(t.tx, t.ty))).toBe(true);
  });

  it('an idle unit and an enemy unit on the footprint exit onto a free ring tile, never across the wall or a house', () => {
    const { world, map } = probe();
    const own = createVillager(world, { tile: { tx: 6, ty: 10 } });
    const enemy = createVillager(world, { tile: { tx: 7, ty: 10 }, playerId: 2 });
    place(world, map);
    for (const v of [own, enemy]) {
      const end = v.movable!.path.at(-1)!;
      expect(map.isPassable(end.tx, end.ty)).toBe(true);
      expect(onFootprintRing(end, { tx: 5, ty: 8 }, { width: 3, height: 3 })).toBe(true);
      expect(end.ty).toBeLessThan(11);
      expect(v.movable!.path.slice(0, -1).every((t) => t.tx >= 5 && t.tx < 8 && t.ty >= 8 && t.ty < 11)).toBe(true);
    }
  });

  it('a builder with an order prefers the ring tile from which its site is reachable', () => {
    const world = createEcsWorld();
    const map = new MapData(20, 20, TERRAIN.grass);
    // A wall line through the barracks' middle row splits its ring into north and south.
    for (let x = 0; x < 20; x++) if (x < 5 || x > 7) createWall(world, { tile: { tx: x, ty: 9 }, playerId: 2, mapData: map });
    const site = createBuilding(world, { type: 'house', origin: { tx: 6, ty: 15 }, playerId: 1, mapData: map, underConstruction: true });
    const v = createVillager(world, { tile: { tx: 6, ty: 9 } });
    world.addComponent(v, 'buildCommand', { targetId: site.id! });
    place(world, map);
    expect(v.movable!.path.at(-1)!.ty).toBe(11);
  });
});
