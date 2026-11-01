import { describe, expect, it } from 'vitest';
import { NAVAL } from '../../config/balance';
import { gameEvents } from '../../game/events';
import { applyDamage } from '../../game/kill';
import { computePopulation } from '../../game/population';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { createUnit } from '../archetypes/createUnit';
import { createEcsWorld } from '../world';
import { MovementSystem } from './MovementSystem';
import { PathfindingSystem } from './PathfindingSystem';
import { TransportSystem } from './TransportSystem';

/** Two islands: land at x < 12 (west) and x > 27 (east), sea between them. */
function setup() {
  const map = new MapData(40, 30, TERRAIN.grass);
  for (let ty = 0; ty < 30; ty++) for (let tx = 12; tx <= 27; tx++) map.setTile(tx, ty, TERRAIN.water);
  const world = createEcsWorld();
  const pathing = new PathfindingSystem(world, map);
  const movement = new MovementSystem(world, null, map);
  const transports = new TransportSystem(world, map);
  const step = (ms: number) => {
    for (let t = 0; t < ms; t += 100) {
      pathing.update();
      movement.update(100);
      transports.update(100);
    }
  };
  return { map, world, step };
}

const inWorld = (world: ReturnType<typeof createEcsWorld>, e: object) => world.entities.includes(e);

describe('TransportSystem (M14)', () => {
  it('land units board a transport at the shore, cross the sea and unload on the far island', () => {
    const { map, world, step } = setup();
    const ship = createUnit(world, { type: 'transport', tile: { tx: 12, ty: 10 }, playerId: 1 });
    const units = [0, 1, 2].map((i) => createUnit(world, { type: 'swordsman', tile: { tx: 5, ty: 8 + i }, playerId: 1 }));
    for (const u of units) world.addComponent(u, 'boardIntent', { transportId: ship.id! });
    step(20_000);
    expect(ship.cargo?.units).toHaveLength(3);
    for (const u of units) expect(inWorld(world, u)).toBe(false);
    world.addComponent(ship, 'unloadIntent', { target: { tx: 33, ty: 10 } });
    step(30_000);
    expect(ship.cargo?.units ?? []).toHaveLength(0);
    for (const u of units) {
      expect(inWorld(world, u)).toBe(true);
      expect(u.position!.tx).toBeGreaterThan(27);
      expect(map.isPassable(u.position!.tx, u.position!.ty)).toBe(true);
    }
  });

  it('a full transport takes no more units; the rest drop their order', () => {
    const { world, step } = setup();
    const ship = createUnit(world, { type: 'transport', tile: { tx: 12, ty: 10 }, playerId: 1 });
    const units = Array.from({ length: NAVAL.transportCapacity + 2 }, (_, i) =>
      createUnit(world, { type: 'archer', tile: { tx: 10, ty: 4 + i }, playerId: 1 }),
    );
    for (const u of units) world.addComponent(u, 'boardIntent', { transportId: ship.id! });
    step(20_000);
    expect(ship.cargo?.units).toHaveLength(NAVAL.transportCapacity);
    const left = units.filter((u) => inWorld(world, u));
    expect(left).toHaveLength(2);
    for (const u of left) expect(u.boardIntent).toBeUndefined();
  });

  it('ships, enemy transports and far-off unload targets are refused', () => {
    const { world, step } = setup();
    const mine = createUnit(world, { type: 'transport', tile: { tx: 12, ty: 10 }, playerId: 1 });
    const theirs = createUnit(world, { type: 'transport', tile: { tx: 12, ty: 14 }, playerId: 2 });
    const galley = createUnit(world, { type: 'galley', tile: { tx: 13, ty: 10 }, playerId: 1 });
    const archer = createUnit(world, { type: 'archer', tile: { tx: 10, ty: 14 }, playerId: 1 });
    world.addComponent(galley, 'boardIntent', { transportId: mine.id! });
    world.addComponent(archer, 'boardIntent', { transportId: theirs.id! });
    step(500);
    expect(galley.boardIntent).toBeUndefined();
    expect(archer.boardIntent).toBeUndefined();
    expect(mine.cargo?.units ?? []).toHaveLength(0);
  });

  it('a transport sunk with its cargo loses the cargo; each lost unit counts as killed', () => {
    const { world, step } = setup();
    const ship = createUnit(world, { type: 'transport', tile: { tx: 12, ty: 10 }, playerId: 1 });
    const units = [0, 1].map((i) => createUnit(world, { type: 'swordsman', tile: { tx: 10, ty: 9 + i }, playerId: 1 }));
    for (const u of units) world.addComponent(u, 'boardIntent', { transportId: ship.id! });
    step(5_000);
    expect(ship.cargo?.units).toHaveLength(2);
    // Population counts the cargo.
    expect(computePopulation(world.entities, 1, 0).current).toBe(3);
    const killed: string[] = [];
    const off = gameEvents.on('entityKilled', (e) => void (e.unitType && killed.push(`${e.killerId}:${e.unitType}`)));
    applyDamage(world, ship as Parameters<typeof applyDamage>[1], 10_000, 2);
    off();
    expect(killed.sort()).toEqual(['2:swordsman', '2:swordsman', '2:transport']);
    expect(ship.cargo?.units ?? []).toHaveLength(0);
  });
});

describe('TransportSystem: a transport out at sea (M14)', () => {
  it('comes in to the shore by the units that want to board it', () => {
    const { world, step } = setup();
    // Out in the strait, no land beside it.
    const ship = createUnit(world, { type: 'transport', tile: { tx: 20, ty: 20 }, playerId: 1 });
    const u = createUnit(world, { type: 'swordsman', tile: { tx: 6, ty: 6 }, playerId: 1 });
    world.addComponent(u, 'boardIntent', { transportId: ship.id! });
    step(40_000);
    expect(ship.cargo?.units).toHaveLength(1);
  });
});

describe('TransportSystem: unloading beside a blocked shore (M14)', () => {
  it('a voyage that ends with no land beside it (a dock there) goes on to the nearest open shore and unloads', () => {
    const { map, world, step } = setup();
    // The far shore right by the target is built up: a wall of blocked tiles along it.
    for (let ty = 5; ty <= 15; ty++) map.setBlocked(28, ty, true);
    const ship = createUnit(world, { type: 'transport', tile: { tx: 13, ty: 10 }, playerId: 1 });
    const u = createUnit(world, { type: 'archer', tile: { tx: 11, ty: 10 }, playerId: 1 });
    world.addComponent(u, 'boardIntent', { transportId: ship.id! });
    step(5_000);
    expect(ship.cargo?.units).toHaveLength(1);
    world.addComponent(ship, 'unloadIntent', { target: { tx: 28, ty: 10 } });
    step(60_000);
    expect(ship.cargo?.units ?? []).toHaveLength(0);
    expect(u.position!.tx).toBeGreaterThan(27);
  });
});
