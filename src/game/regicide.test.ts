import { describe, expect, it } from 'vitest';
import { createBuilding } from '../ecs/archetypes/building';
import { createUnit } from '../ecs/archetypes/createUnit';
import type { CargoUnit, Entity } from '../ecs/components';
import { queueUnit } from '../ecs/queueUnit';
import { startResearch, playerWallet } from '../ecs/research';
import { TransportSystem } from '../ecs/systems/TransportSystem';
import { createEcsWorld, type EcsWorld } from '../ecs/world';
import { MapData } from '../map/MapData';
import { reachMask } from '../map/gridSteps';
import { villagerSpawnTiles } from '../map/startLayout';
import { TERRAIN } from '../map/TerrainTypes';
import { applyDamage, killEntity } from './kill';
import { createPlayer } from './Player';
import { hasLivingKing, kingStartTile, livingKings } from './regicide';

type Mortal = Entity & { health: { current: number; max: number } };

function kingOf(world: EcsWorld, playerId: number, tx = 5) {
  return createUnit(world, { type: 'king', tile: { tx, ty: 5 }, playerId }) as Mortal;
}

function aboard(world: EcsWorld, playerId: number) {
  const king = kingOf(world, playerId);
  const ship = createUnit(world, { type: 'transport', tile: { tx: 9, ty: 5 }, playerId }) as Mortal;
  world.remove(king);
  world.addComponent(ship, 'cargo', { units: [king as CargoUnit] });
  return { king, ship };
}

describe('hasLivingKing (M19)', () => {
  it('is per player, and only a king counts', () => {
    const world = createEcsWorld();
    kingOf(world, 2);
    createUnit(world, { type: 'knight', tile: { tx: 4, ty: 4 }, playerId: 1 });
    expect(hasLivingKing(world, 1)).toBe(false);
    expect(hasLivingKing(world, 2)).toBe(true);
  });

  it('a dying king is not alive, nor is a removed one', () => {
    const world = createEcsWorld();
    const dying = kingOf(world, 1);
    const gone = kingOf(world, 2);
    killEntity(world, dying);
    world.remove(gone);
    expect(hasLivingKing(world, 1)).toBe(false);
    expect(hasLivingKing(world, 2)).toBe(false);
  });

  it('a king in a living transport is alive, and is not on the map', () => {
    const world = createEcsWorld();
    aboard(world, 1);
    expect(hasLivingKing(world, 1)).toBe(true);
    expect(hasLivingKing(world, 2)).toBe(false);
    expect([...livingKings(world)]).toEqual([]);
  });

  it('a king sunk with the transport is dead in that very call', () => {
    const world = createEcsWorld();
    const { ship } = aboard(world, 1);
    expect(applyDamage(world, ship, 10_000, 2)).toBe(true);
    expect(hasLivingKing(world, 1)).toBe(false);
  });

  it('a king in a dying transport is not alive, whatever its cargo still lists', () => {
    const world = createEcsWorld();
    const { ship } = aboard(world, 1);
    killEntity(world, ship);
    expect(ship.cargo?.units).toHaveLength(1);
    expect(hasLivingKing(world, 1)).toBe(false);
  });

  it('boarding and going ashore keep it alive', () => {
    const map = new MapData(20, 20, TERRAIN.grass);
    for (let ty = 0; ty < 20; ty++) for (let tx = 10; tx < 20; tx++) map.setTile(tx, ty, TERRAIN.water);
    const world = createEcsWorld();
    const king = kingOf(world, 1, 9);
    const ship = createUnit(world, { type: 'transport', tile: { tx: 10, ty: 5 }, playerId: 1 });
    const transports = new TransportSystem(world, map);
    world.addComponent(king, 'boardIntent', { transportId: ship.id! });
    transports.update(16);
    expect(world.entities).not.toContain(king);
    expect(hasLivingKing(world, 1)).toBe(true);
    world.addComponent(ship, 'unloadIntent', { target: { tx: 8, ty: 5 } });
    transports.update(16);
    expect(world.entities).toContain(king);
    expect(hasLivingKing(world, 1)).toBe(true);
    expect([...livingKings(world)]).toEqual([king]);
  });
});

describe('kingStartTile (M19)', () => {
  const start = { tx: 12, ty: 12 };
  /** Open ground with the town centre on it. */
  function base() {
    const map = new MapData(24, 24, TERRAIN.grass);
    createBuilding(createEcsWorld(), { type: 'town_center', origin: { tx: 11, ty: 11 }, playerId: 1, mapData: map });
    return map;
  }

  it('open ground: the front corner beside the town centre', () => {
    expect(kingStartTile(start, base())).toEqual({ tx: 14, ty: 14 });
  });

  it('blocked terrain and walls are skipped', () => {
    const map = base();
    map.setTile(14, 14, TERRAIN.forest);
    map.setBlocked(14, 13, true);
    expect(kingStartTile(start, map)).toEqual({ tx: 13, ty: 14 });
  });

  it('is never a tile closed off from the villagers', () => {
    const map = base();
    // A pocket round the front corner, the corner itself free.
    for (const [tx, ty] of [[13, 14], [14, 13], [15, 13], [15, 14], [15, 15], [14, 15], [13, 15]] as const) map.setBlocked(tx, ty, true);
    expect(map.isPassable(14, 14)).toBe(true);
    const tile = kingStartTile(start, map);
    expect(tile).not.toEqual({ tx: 14, ty: 14 });
    expect(reachMask(map, villagerSpawnTiles(start)[1]!)[tile.ty * map.width + tile.tx]).toBe(1);
  });

  it("with the whole ring blocked it goes farther out, never onto a villager's tile", () => {
    const map = base();
    for (let d = -2; d <= 2; d++) for (const [tx, ty] of [[12 + d, 10], [12 + d, 14], [10, 12 + d], [14, 12 + d]] as const) map.setBlocked(tx, ty, true);
    const villagers = villagerSpawnTiles(start);
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== 3) continue;
        const free = villagers.some((v) => v.tx === 12 + dx && v.ty === 12 + dy);
        if (!free) map.setBlocked(12 + dx, 12 + dy, true);
      }
    }
    const tile = kingStartTile(start, map);
    expect(villagers).not.toContainEqual(tile);
    expect(Math.max(Math.abs(tile.tx - 12), Math.abs(tile.ty - 12))).toBe(4);
  });
});

describe("a defeated player's buildings (M19)", () => {
  it('carry no restriction of their own: a standing town centre takes orders, as any building', () => {
    const map = new MapData(30, 30, TERRAIN.grass);
    const world = createEcsWorld();
    const player = createPlayer({ id: 2, age: 2, defeated: true, resources: { food: 2000, wood: 2000, gold: 2000 } });
    const tc = (tx: number) => createBuilding(world, { type: 'town_center', origin: { tx, ty: 3 }, playerId: 2, mapData: map });
    const wallet = playerWallet(player);
    expect(queueUnit(tc(3), 'villager', player, { wallet, population: () => ({ current: 0, cap: 10 }) })).toEqual({ ok: true });
    expect(startResearch(world, tc(10), 'artisan_guilds', player, wallet)).toEqual({ ok: true });
  });
});
