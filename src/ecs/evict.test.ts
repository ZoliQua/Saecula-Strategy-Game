import { describe, expect, it } from 'vitest';
import { MapData } from '../map/MapData';
import { TERRAIN } from '../map/TerrainTypes';
import { createBuilding } from './archetypes/building';
import { createVillager } from './archetypes/villager';
import { createWall } from './archetypes/wall';
import { findPath } from '../map/pathfinding';
import { evictUnitsFrom } from './evict';
import { escapeRulesAt } from './escapeRules';
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

describe('evictUnitsFrom, last resort: a footprint whose whole ring is blocked (final review)', () => {
  const ORIGIN = { tx: 8, ty: 9 };
  const SIZE = { width: 3, height: 3 };
  /** Houses of `owner` (player 1 by default; 0 = Gaia) on every tile of the ring around a 3×3 at (8,9): x 7..11, y 8..12. */
  function enclosedByHouses(owner: (i: number) => number = () => 1) {
    const world = createEcsWorld();
    const map = new MapData(32, 32, TERRAIN.grass);
    const houses: [number, number][] = [[6, 7], [8, 7], [10, 7], [6, 12], [8, 12], [10, 12], [6, 9], [6, 11], [11, 9], [11, 11]];
    houses.forEach(([tx, ty], i) => createBuilding(world, { type: 'house', origin: { tx, ty }, playerId: owner(i), mapData: map }));
    return { world, map };
  }
  const ringBlocked = (map: MapData) => {
    for (let y = 8; y <= 12; y++) for (let x = 7; x <= 11; x++) if (onFootprintRing({ tx: x, ty: y }, ORIGIN, SIZE) && map.isPassable(x, y)) return false;
    return true;
  };

  it('a unit enclosed by its own (and Gaia) houses crosses one to the nearest free tile', () => {
    const { world, map } = enclosedByHouses((i) => (i % 2 === 0 ? 1 : 0));
    const v = createVillager(world, { tile: { tx: 9, ty: 10 } });
    createBuilding(world, { type: 'barracks', origin: ORIGIN, playerId: 1, mapData: map, underConstruction: true });
    expect(ringBlocked(map)).toBe(true);
    evictUnitsFrom(world, map, ORIGIN, SIZE);
    const path = v.movable!.path;
    expect(path.length).toBeGreaterThan(0);
    const end = path.at(-1)!;
    expect(map.isPassable(end.tx, end.ty)).toBe(true);
    // Everything before the exit is blocked ground (the barracks, then one house); nothing longer than needed.
    expect(path.slice(0, -1).every((t) => !map.isPassable(t.tx, t.ty))).toBe(true);
    expect(path.length).toBeLessThanOrEqual(3);
  });

  it('a unit standing there later re-plans out the same way (escapeRulesAt), and reaches its goal', () => {
    const { world, map } = enclosedByHouses();
    createBuilding(world, { type: 'barracks', origin: ORIGIN, playerId: 1, mapData: map });
    const path = findPath(map, { tx: 9, ty: 10 }, { tx: 25, ty: 25 }, escapeRulesAt(world, { tx: 9, ty: 10 }, map, 1));
    expect(path?.at(-1)).toEqual({ tx: 25, ty: 25 });
  });

  it("a unit enclosed by another player's houses stays (never crossed; same documented limit as walls)", () => {
    const { world, map } = enclosedByHouses(() => 2);
    const v = createVillager(world, { tile: { tx: 9, ty: 10 }, playerId: 1 });
    createBuilding(world, { type: 'barracks', origin: ORIGIN, playerId: 1, mapData: map, underConstruction: true });
    evictUnitsFrom(world, map, ORIGIN, SIZE);
    expect(v.movable!.path).toEqual([]);
    expect(findPath(map, { tx: 9, ty: 10 }, { tx: 25, ty: 25 }, escapeRulesAt(world, { tx: 9, ty: 10 }, map, 1))).toBeNull();
    // Player 2's own unit there may cross its own houses.
    expect(findPath(map, { tx: 9, ty: 10 }, { tx: 25, ty: 25 }, escapeRulesAt(world, { tx: 9, ty: 10 }, map, 2))?.at(-1)).toEqual({ tx: 25, ty: 25 });
  });

  it('a ring of own and enemy houses: only the own house is crossed, even when the goal lies past the enemy', () => {
    // Own house only at the east side (11,9); every other ring house is player 2's.
    const { world, map } = enclosedByHouses((i) => (i === 8 ? 1 : 2));
    createBuilding(world, { type: 'barracks', origin: ORIGIN, playerId: 1, mapData: map });
    const path = findPath(map, { tx: 9, ty: 10 }, { tx: 2, ty: 10 }, escapeRulesAt(world, { tx: 9, ty: 10 }, map, 1))!;
    expect(path.at(-1)).toEqual({ tx: 2, ty: 10 });
    const enemyTiles = world.with('building', 'owner', 'position').entities.filter((b) => b.owner.playerId === 2);
    const onEnemy = (t: { tx: number; ty: number }) =>
      enemyTiles.some((b) => t.tx >= b.position.tx && t.tx < b.position.tx + 2 && t.ty >= b.position.ty && t.ty < b.position.ty + 2);
    expect(path.some(onEnemy)).toBe(false);
  });

  it('a unit enclosed by wall segments stays (walls are never crossed; documented limit)', () => {
    const world = createEcsWorld();
    const map = new MapData(32, 32, TERRAIN.grass);
    for (let y = 8; y <= 12; y++) for (let x = 7; x <= 11; x++) {
      if (onFootprintRing({ tx: x, ty: y }, ORIGIN, SIZE)) createWall(world, { tile: { tx: x, ty: y }, playerId: 2, mapData: map });
    }
    const v = createVillager(world, { tile: { tx: 9, ty: 10 } });
    createBuilding(world, { type: 'barracks', origin: ORIGIN, playerId: 1, mapData: map, underConstruction: true });
    evictUnitsFrom(world, map, ORIGIN, SIZE);
    expect(v.movable!.path).toEqual([]);
    expect(findPath(map, { tx: 9, ty: 10 }, { tx: 25, ty: 25 }, escapeRulesAt(world, { tx: 9, ty: 10 }, map, 1))).toBeNull();
  });

  it('a ring of houses and water: the house is crossed, the water never', () => {
    const world = createEcsWorld();
    const map = new MapData(32, 32, TERRAIN.grass);
    // Water everywhere around but a house at (6,9) on the west side, with free grass beyond it at x=5.
    for (let y = 6; y <= 14; y++) for (let x = 6; x <= 13; x++) map.setTile(x, y, TERRAIN.water);
    for (const [x, y] of [[6, 9], [7, 9], [6, 10], [7, 10]] as const) map.setTile(x, y, TERRAIN.grass);
    for (let y = 9; y <= 11; y++) for (let x = 8; x <= 10; x++) map.setTile(x, y, TERRAIN.grass);
    createBuilding(world, { type: 'house', origin: { tx: 6, ty: 9 }, playerId: 1, mapData: map });
    const v = createVillager(world, { tile: { tx: 9, ty: 10 } });
    createBuilding(world, { type: 'barracks', origin: ORIGIN, playerId: 1, mapData: map, underConstruction: true });
    evictUnitsFrom(world, map, ORIGIN, SIZE);
    const path = v.movable!.path;
    expect(path.at(-1)!.tx).toBe(5);
    expect(path.every((t) => map.getTile(t.tx, t.ty) !== TERRAIN.water)).toBe(true);
  });
});
