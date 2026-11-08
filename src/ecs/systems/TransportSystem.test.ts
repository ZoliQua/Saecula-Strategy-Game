import { describe, expect, it } from 'vitest';
import { NAVAL } from '../../config/balance';
import { gameEvents } from '../../game/events';
import { applyDamage } from '../../game/kill';
import { computePopulation } from '../../game/population';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { createUnit } from '../archetypes/createUnit';
import { clearUnitOrders } from '../orders';
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

describe('TransportSystem: a shore the unit cannot reach (M14)', () => {
  it('the transport comes over to the unit; the order never re-plans forever', () => {
    const { map, world, step } = setup();
    // The transport lies beside a shore pocket walled off by forest; the unit stands farther down the coast.
    for (let ty = 7; ty <= 13; ty++) map.setTile(8, ty, TERRAIN.forest);
    for (let tx = 8; tx <= 11; tx++) {
      map.setTile(tx, 7, TERRAIN.forest);
      map.setTile(tx, 13, TERRAIN.forest);
    }
    const ship = createUnit(world, { type: 'transport', tile: { tx: 12, ty: 10 }, playerId: 1 });
    const u = createUnit(world, { type: 'swordsman', tile: { tx: 3, ty: 22 }, playerId: 1 });
    world.addComponent(u, 'boardIntent', { transportId: ship.id! });
    step(60_000);
    expect(ship.cargo?.units.length ?? 0).toBe(1);
  });

  it('a transport nobody can reach: the boarding order is dropped in the end', () => {
    const { map, world, step } = setup();
    // A lagoon cut off from the unit's land and from the sea.
    for (let ty = 0; ty < 30; ty++) map.setTile(4, ty, TERRAIN.water);
    for (let ty = 0; ty < 30; ty++) map.setTile(5, ty, TERRAIN.cliff);
    const ship = createUnit(world, { type: 'transport', tile: { tx: 4, ty: 10 }, playerId: 1 });
    const u = createUnit(world, { type: 'swordsman', tile: { tx: 9, ty: 10 }, playerId: 1 });
    world.addComponent(u, 'boardIntent', { transportId: ship.id! });
    step(120_000);
    expect(u.boardIntent).toBeUndefined();
  });
});

describe('TransportSystem: boarding at real frame rates (M14)', () => {
  it('units waiting on the shore keep their order while the transport sails in (16 ms frames)', () => {
    const map = new MapData(40, 30, TERRAIN.grass);
    for (let ty = 0; ty < 30; ty++) for (let tx = 12; tx <= 39; tx++) map.setTile(tx, ty, TERRAIN.water);
    const world = createEcsWorld();
    const pathing = new PathfindingSystem(world, map);
    const movement = new MovementSystem(world, null, map);
    const transports = new TransportSystem(world, map);
    // Far out at sea; the unit is right by the shore.
    const ship = createUnit(world, { type: 'transport', tile: { tx: 36, ty: 10 }, playerId: 1 });
    const u = createUnit(world, { type: 'swordsman', tile: { tx: 11, ty: 10 }, playerId: 1 });
    world.addComponent(u, 'boardIntent', { transportId: ship.id! });
    for (let t = 0; t < 40_000 && !ship.cargo; t += 16) {
      pathing.update();
      movement.update(16);
      transports.update(16);
    }
    expect(ship.cargo?.units).toHaveLength(1);
  });
});

describe('TransportSystem: calling the transport over (M14)', () => {
  it('a transport that cannot come any closer is not sent a path search every frame', () => {
    const { map, world } = setup();
    // A lagoon the transport cannot leave; the unit's shore is out of its reach.
    for (let ty = 0; ty < 30; ty++) map.setTile(4, ty, TERRAIN.water);
    for (let ty = 0; ty < 30; ty++) map.setTile(5, ty, TERRAIN.cliff);
    const pathing = new PathfindingSystem(world, map);
    const transports = new TransportSystem(world, map);
    const ship = createUnit(world, { type: 'transport', tile: { tx: 4, ty: 10 }, playerId: 1 });
    const u = createUnit(world, { type: 'swordsman', tile: { tx: 9, ty: 10 }, playerId: 1 });
    world.addComponent(u, 'boardIntent', { transportId: ship.id! });
    let calls = 0;
    for (let t = 0; t < 5_000; t += 16) {
      if (ship.moveIntent) calls++;
      pathing.update();
      transports.update(16);
    }
    expect(calls).toBeLessThan(5);
  });
});

describe('TransportSystem: a boarding order given again (M14)', () => {
  it('a unit re-ordered onto the same transport walks to it again', () => {
    const { map, world } = setup();
    const transports = new TransportSystem(world, map);
    const ship = createUnit(world, { type: 'transport', tile: { tx: 12, ty: 10 }, playerId: 1 });
    const u = createUnit(world, { type: 'swordsman', tile: { tx: 4, ty: 10 }, playerId: 1 });
    world.addComponent(u, 'boardIntent', { transportId: ship.id! });
    transports.update(16);
    expect(u.moveIntent).toBeDefined();
    // Another order in between (a plain stop), then the same boarding order again; the transport has not moved.
    clearUnitOrders(world, u);
    world.addComponent(u, 'boardIntent', { transportId: ship.id! });
    transports.update(16);
    expect(u.moveIntent?.target).toEqual({ tx: 11, ty: 10 });
  });
});

describe('TransportSystem: unloading in a narrow strait (M14)', () => {
  it('puts the cargo ashore only on the land it sailed for, never on the far bank', () => {
    // West bank x <= 10, a two-tile strait (x 11-12), east bank x >= 13.
    const map = new MapData(30, 20, TERRAIN.grass);
    for (let ty = 0; ty < 20; ty++) for (const tx of [11, 12]) map.setTile(tx, ty, TERRAIN.water);
    const world = createEcsWorld();
    const transports = new TransportSystem(world, map);
    const ship = createUnit(world, { type: 'transport', tile: { tx: 12, ty: 10 }, playerId: 1 });
    const units = Array.from({ length: NAVAL.transportCapacity }, (_, i) =>
      createUnit(world, { type: 'swordsman', tile: { tx: 2, ty: 2 + i }, playerId: 1 }),
    );
    for (const u of units) world.remove(u);
    world.addComponent(ship, 'cargo', { units: [...units] });
    // Within NAVAL.unloadReach of the target, on the east bank: ashore at once.
    world.addComponent(ship, 'unloadIntent', { target: { tx: 15, ty: 10 } });
    transports.update(16);
    expect(ship.cargo?.units ?? []).toHaveLength(0);
    for (const u of units) expect(u.position!.tx, `${u.position!.tx},${u.position!.ty}`).toBeGreaterThanOrEqual(13);
  });

  it('beside both banks of a one-tile strait, lands on the bank the target is on (probe A)', () => {
    // West bank x <= 10, a one-tile strait (x 11), east bank x >= 12; the target is on the west bank.
    const map = new MapData(30, 20, TERRAIN.grass);
    for (let ty = 0; ty < 20; ty++) map.setTile(11, ty, TERRAIN.water);
    const world = createEcsWorld();
    const transports = new TransportSystem(world, map);
    const ship = createUnit(world, { type: 'transport', tile: { tx: 11, ty: 7 }, playerId: 1 });
    const units = Array.from({ length: NAVAL.transportCapacity }, (_, i) =>
      createUnit(world, { type: 'swordsman', tile: { tx: 20, ty: 2 + i }, playerId: 1 }),
    );
    for (const u of units) world.remove(u);
    world.addComponent(ship, 'cargo', { units: [...units] });
    world.addComponent(ship, 'unloadIntent', { target: { tx: 10, ty: 10 } });
    transports.update(16);
    expect(ship.cargo?.units ?? []).toHaveLength(0);
    for (const u of units) expect(u.position!.tx, `${u.position!.tx},${u.position!.ty}`).toBeLessThanOrEqual(10);
  });

  it('within reach of the target but beside only the far bank, sails on to the bank of the target (probe B)', () => {
    // West bank x <= 10, a two-tile strait (x 11-12), east bank x >= 13; the ship touches only the west bank.
    const map = new MapData(30, 20, TERRAIN.grass);
    for (let ty = 0; ty < 20; ty++) for (const tx of [11, 12]) map.setTile(tx, ty, TERRAIN.water);
    const world = createEcsWorld();
    const pathing = new PathfindingSystem(world, map);
    const movement = new MovementSystem(world, null, map);
    const transports = new TransportSystem(world, map);
    const ship = createUnit(world, { type: 'transport', tile: { tx: 11, ty: 7 }, playerId: 1 });
    const units = Array.from({ length: NAVAL.transportCapacity }, (_, i) =>
      createUnit(world, { type: 'swordsman', tile: { tx: 2, ty: 2 + i }, playerId: 1 }),
    );
    for (const u of units) world.remove(u);
    world.addComponent(ship, 'cargo', { units: [...units] });
    world.addComponent(ship, 'unloadIntent', { target: { tx: 13, ty: 10 } });
    for (let t = 0; t < 10_000 && (ship.cargo?.units.length ?? 0) > 0; t += 100) {
      pathing.update();
      movement.update(100);
      transports.update(100);
    }
    expect(ship.cargo?.units ?? []).toHaveLength(0);
    for (const u of units) expect(u.position!.tx, `${u.position!.tx},${u.position!.ty}`).toBeGreaterThanOrEqual(13);
  });

  it('a target inside a built-up block (no free tile beside it) still decides the bank', () => {
    // A one-tile strait (x 11) that ends at ty 7; a cliff below it keeps the banks apart.
    const map = new MapData(30, 20, TERRAIN.grass);
    for (let ty = 0; ty < 20; ty++) map.setTile(11, ty, ty <= 7 ? TERRAIN.water : TERRAIN.cliff);
    // The target stands in the middle of a 3x3 block on the west bank (a building's centre tile).
    for (let ty = 11; ty <= 13; ty++) for (let tx = 8; tx <= 10; tx++) map.setBlocked(tx, ty, true);
    const world = createEcsWorld();
    const pathing = new PathfindingSystem(world, map);
    const movement = new MovementSystem(world, null, map);
    const transports = new TransportSystem(world, map);
    const ship = createUnit(world, { type: 'transport', tile: { tx: 11, ty: 7 }, playerId: 1 });
    const units = Array.from({ length: NAVAL.transportCapacity }, (_, i) =>
      createUnit(world, { type: 'swordsman', tile: { tx: 20, ty: 2 + i }, playerId: 1 }),
    );
    for (const u of units) world.remove(u);
    world.addComponent(ship, 'cargo', { units: [...units] });
    world.addComponent(ship, 'unloadIntent', { target: { tx: 9, ty: 12 } });
    for (let t = 0; t < 10_000 && (ship.cargo?.units.length ?? 0) > 0; t += 100) {
      pathing.update();
      movement.update(100);
      transports.update(100);
    }
    expect(ship.cargo?.units ?? []).toHaveLength(0);
    for (const u of units) expect(u.position!.tx, `${u.position!.tx},${u.position!.ty}`).toBeLessThanOrEqual(10);
  });

  it('seeks an open shore only on water it can sail to, never a pond inland', () => {
    // Land x < 12, sea x 12-27, land x > 27; the shore by the target is built up.
    const map = new MapData(40, 30, TERRAIN.grass);
    for (let ty = 0; ty < 30; ty++) for (let tx = 12; tx <= 27; tx++) map.setTile(tx, ty, TERRAIN.water);
    for (let ty = 5; ty <= 15; ty++) map.setBlocked(28, ty, true);
    // A pond right by the target, nearer to it than any open sea shore.
    for (let ty = 12; ty <= 13; ty++) for (let tx = 32; tx <= 33; tx++) map.setTile(tx, ty, TERRAIN.water);
    const world = createEcsWorld();
    const pathing = new PathfindingSystem(world, map);
    const movement = new MovementSystem(world, null, map);
    const transports = new TransportSystem(world, map);
    const ship = createUnit(world, { type: 'transport', tile: { tx: 14, ty: 10 }, playerId: 1 });
    const u = createUnit(world, { type: 'archer', tile: { tx: 2, ty: 2 }, playerId: 1 });
    world.remove(u);
    world.addComponent(ship, 'cargo', { units: [u] });
    world.addComponent(ship, 'unloadIntent', { target: { tx: 33, ty: 10 } });
    for (let t = 0; t < 60_000 && (ship.cargo?.units.length ?? 0) > 0; t += 100) {
      pathing.update();
      movement.update(100);
      transports.update(100);
    }
    expect(ship.cargo?.units ?? []).toHaveLength(0);
    expect(u.position!.tx).toBeGreaterThan(27);
  });

  it('a target buried in a block by a one-tile strait: its land is found through the block, never across the water', () => {
    // A one-tile strait (x 11) down to ty 20, a cliff below it; a 4x4 block (x 7-10, y 10-13) on the west bank.
    const map = new MapData(30, 30, TERRAIN.grass);
    for (let ty = 0; ty < 30; ty++) map.setTile(11, ty, ty <= 20 ? TERRAIN.water : TERRAIN.cliff);
    for (let ty = 10; ty <= 13; ty++) for (let tx = 7; tx <= 10; tx++) map.setBlocked(tx, ty, true);
    const world = createEcsWorld();
    const pathing = new PathfindingSystem(world, map);
    const movement = new MovementSystem(world, null, map);
    const transports = new TransportSystem(world, map);
    const ship = createUnit(world, { type: 'transport', tile: { tx: 11, ty: 2 }, playerId: 1 });
    const units = Array.from({ length: NAVAL.transportCapacity }, (_, i) =>
      createUnit(world, { type: 'swordsman', tile: { tx: 20, ty: 2 + i }, playerId: 1 }),
    );
    for (const u of units) world.remove(u);
    world.addComponent(ship, 'cargo', { units: [...units] });
    world.addComponent(ship, 'unloadIntent', { target: { tx: 10, ty: 12 } });
    for (let t = 0; t < 20_000 && (ship.cargo?.units.length ?? 0) > 0; t += 100) {
      pathing.update();
      movement.update(100);
      transports.update(100);
    }
    expect(ship.cargo?.units ?? []).toHaveLength(0);
    for (const u of units) expect(u.position!.tx, `${u.position!.tx},${u.position!.ty}`).toBeLessThanOrEqual(10);
  });
});
