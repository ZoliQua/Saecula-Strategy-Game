import { describe, expect, it } from 'vitest';
import { NAVAL, REPATH_RETRY_MS } from '../../config/balance';
import { canConvert } from '../../game/convert';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { createBuilding } from '../archetypes/building';
import { createUnit } from '../archetypes/createUnit';
import { createEcsWorld } from '../world';
import { canAttackTarget } from '../navLayer';
import { CombatSystem } from './CombatSystem';
import { MovementSystem } from './MovementSystem';
import { PathfindingSystem } from './PathfindingSystem';
import { ProjectileSystem } from './ProjectileSystem';

/** Land on the west (x < 15), sea on the east. */
function setup() {
  const map = new MapData(30, 30, TERRAIN.grass);
  for (let ty = 0; ty < 30; ty++) for (let tx = 15; tx < 30; tx++) map.setTile(tx, ty, TERRAIN.water);
  const world = createEcsWorld();
  const combat = new CombatSystem(world, map);
  const projectiles = new ProjectileSystem(world);
  const pathing = new PathfindingSystem(world, map);
  const movement = new MovementSystem(world, null, map);
  const step = (ms: number) => {
    for (let t = 0; t < ms; t += 100) {
      pathing.update();
      movement.update(100);
      combat.update(100);
      projectiles.update(100);
    }
  };
  return { map, world, step };
}

describe('naval combat (M14)', () => {
  it('who may attack a ship: ranged units and ships yes, melee units no', () => {
    const { world } = setup();
    const ship = createUnit(world, { type: 'galley', tile: { tx: 16, ty: 5 }, playerId: 2 });
    expect(canAttackTarget(createUnit(world, { type: 'archer', tile: { tx: 13, ty: 5 }, playerId: 1 }), ship)).toBe(true);
    expect(canAttackTarget(createUnit(world, { type: 'galley', tile: { tx: 20, ty: 5 }, playerId: 1 }), ship)).toBe(true);
    expect(canAttackTarget(createUnit(world, { type: 'swordsman', tile: { tx: 14, ty: 5 }, playerId: 1 }), ship)).toBe(false);
    expect(canAttackTarget(createUnit(world, { type: 'knight', tile: { tx: 14, ty: 6 }, playerId: 1 }), ship)).toBe(false);
  });

  it('a galley sails into range and sinks an enemy galley; it shoots a unit on the shore from the water', () => {
    const { map, world, step } = setup();
    const ours = createUnit(world, { type: 'galley', tile: { tx: 28, ty: 25 }, playerId: 1 });
    const theirs = createUnit(world, { type: 'galley', tile: { tx: 20, ty: 5 }, playerId: 2 });
    world.addComponent(ours, 'attackIntent', { targetId: theirs.id! });
    step(10_000);
    expect(theirs.health!.current).toBeLessThan(theirs.health!.max);
    expect(map.getTile(ours.position!.tx, ours.position!.ty)).toBe(TERRAIN.water);
    const villager = createUnit(world, { type: 'villager', tile: { tx: 13, ty: 25 }, playerId: 2 });
    world.removeComponent(ours, 'attackIntent');
    world.addComponent(ours, 'attackIntent', { targetId: villager.id! });
    step(15_000);
    expect(villager.health!.current).toBeLessThan(villager.health!.max);
    expect(map.getTile(ours.position!.tx, ours.position!.ty)).toBe(TERRAIN.water);
  });

  it('a frigate batters a building on the shore', () => {
    const { map, world, step } = setup();
    const house = createBuilding(world, { type: 'house', origin: { tx: 12, ty: 10 }, playerId: 2, mapData: map });
    const frigate = createUnit(world, { type: 'frigate', tile: { tx: 25, ty: 10 }, playerId: 1 });
    world.addComponent(frigate, 'attackIntent', { targetId: house.id! });
    step(20_000);
    expect(house.health!.current).toBeLessThan(house.health!.max);
  });

  it('a melee unit ordered onto a ship drops the order; an archer on the shore shoots the ship', () => {
    const { world, step } = setup();
    const ship = createUnit(world, { type: 'galley', tile: { tx: 16, ty: 5 }, playerId: 2 });
    const sword = createUnit(world, { type: 'swordsman', tile: { tx: 10, ty: 5 }, playerId: 1 });
    world.addComponent(sword, 'attackIntent', { targetId: ship.id! });
    step(200);
    expect(sword.attackIntent).toBeUndefined();
    const archer = createUnit(world, { type: 'archer', tile: { tx: 8, ty: 5 }, playerId: 1 });
    world.addComponent(archer, 'attackIntent', { targetId: ship.id! });
    step(10_000);
    expect(ship.health!.current).toBeLessThan(ship.health!.max);
  });

  it('a monk cannot convert a ship', () => {
    const { world } = setup();
    expect(canConvert(createUnit(world, { type: 'galley', tile: { tx: 16, ty: 5 }, playerId: 2 }), 1)).toBe(false);
    expect(canConvert(createUnit(world, { type: 'transport', tile: { tx: 17, ty: 5 }, playerId: 2 }), 1)).toBe(false);
  });
});

describe('naval combat: a target out of reach from the water (M14)', () => {
  it('a ship ordered onto a target far inland gives up instead of keeping the order forever', () => {
    const { world, step } = setup();
    const galley = createUnit(world, { type: 'galley', tile: { tx: 22, ty: 10 }, playerId: 1 });
    // 13 tiles from the sea, far beyond a galley's range.
    const villager = createUnit(world, { type: 'villager', tile: { tx: 2, ty: 10 }, playerId: 2 });
    world.addComponent(galley, 'attackIntent', { targetId: villager.id! });
    step(30_000);
    expect(galley.attackIntent).toBeUndefined();
    expect(villager.health!.current).toBe(villager.health!.max);
  });

  it('a target in range only from a lake the ship cannot sail to: the ship gives up', () => {
    const { map, world, step } = setup();
    // A lake inland; the target stands on its shore, out of range of the sea.
    for (let ty = 9; ty <= 11; ty++) for (let tx = 2; tx <= 4; tx++) map.setTile(tx, ty, TERRAIN.water);
    const galley = createUnit(world, { type: 'galley', tile: { tx: 22, ty: 10 }, playerId: 1 });
    const villager = createUnit(world, { type: 'villager', tile: { tx: 5, ty: 10 }, playerId: 2 });
    world.addComponent(galley, 'attackIntent', { targetId: villager.id! });
    step(30_000);
    expect(galley.attackIntent).toBeUndefined();
  });

  it('a target only briefly out of reach (it walked inland and back) keeps the order', () => {
    const { world, step } = setup();
    const galley = createUnit(world, { type: 'galley', tile: { tx: 22, ty: 10 }, playerId: 1 });
    // Inland at first, out of reach from the water.
    const villager = createUnit(world, { type: 'villager', tile: { tx: 2, ty: 10 }, playerId: 2 });
    world.addComponent(galley, 'attackIntent', { targetId: villager.id! });
    step(Math.floor(NAVAL.shipUnreachableGiveUpMs / 2));
    expect(galley.attackIntent?.targetId).toBe(villager.id);
    // Back on the shore: the ship closes in and shoots.
    villager.position = { tx: 14, ty: 10 };
    step(15_000);
    expect(villager.health!.current).toBeLessThan(villager.health!.max);
  });

  it('a target that stays out of reach is given up after NAVAL.shipUnreachableGiveUpMs, not before', () => {
    const { world, step } = setup();
    const galley = createUnit(world, { type: 'galley', tile: { tx: 22, ty: 10 }, playerId: 1 });
    const villager = createUnit(world, { type: 'villager', tile: { tx: 2, ty: 10 }, playerId: 2 });
    world.addComponent(galley, 'attackIntent', { targetId: villager.id! });
    step(NAVAL.shipUnreachableGiveUpMs - REPATH_RETRY_MS);
    expect(galley.attackIntent?.targetId).toBe(villager.id);
    step(2 * REPATH_RETRY_MS);
    expect(galley.attackIntent).toBeUndefined();
  });

  it('a new order on a target once out of reach starts a fresh wait (not the wait of the old order)', () => {
    const { world, step } = setup();
    const galley = createUnit(world, { type: 'galley', tile: { tx: 22, ty: 10 }, playerId: 1 });
    const villager = createUnit(world, { type: 'villager', tile: { tx: 2, ty: 10 }, playerId: 2 });
    world.addComponent(galley, 'attackIntent', { targetId: villager.id! });
    step(Math.floor(NAVAL.shipUnreachableGiveUpMs / 2));
    world.removeComponent(galley, 'attackIntent');
    step(NAVAL.shipUnreachableGiveUpMs);
    world.addComponent(galley, 'attackIntent', { targetId: villager.id! });
    step(1_000);
    expect(galley.attackIntent?.targetId).toBe(villager.id);
  });

  it('a target that came into range resets the wait: walking inland again later does not end the order at once', () => {
    const { world, step } = setup();
    const galley = createUnit(world, { type: 'galley', tile: { tx: 16, ty: 10 }, playerId: 1 });
    const villager = createUnit(world, { type: 'villager', tile: { tx: 2, ty: 10 }, playerId: 2 });
    villager.health!.max = villager.health!.current = 10_000;
    world.addComponent(galley, 'attackIntent', { targetId: villager.id! });
    step(2_000);
    // Into range of the galley where it lies: it shoots without re-pathing.
    villager.position = { tx: 14, ty: 10 };
    step(NAVAL.shipUnreachableGiveUpMs);
    expect(villager.health!.current).toBeLessThan(villager.health!.max);
    // Inland again: a fresh wait.
    villager.position = { tx: 2, ty: 10 };
    step(1_000);
    expect(galley.attackIntent?.targetId).toBe(villager.id);
  });

  it('waiting on an unreachable target does not hold up a new reachable order', () => {
    const { world, step } = setup();
    const galley = createUnit(world, { type: 'galley', tile: { tx: 22, ty: 10 }, playerId: 1 });
    const inland = createUnit(world, { type: 'villager', tile: { tx: 2, ty: 10 }, playerId: 2 });
    const shore = createUnit(world, { type: 'villager', tile: { tx: 14, ty: 20 }, playerId: 2 });
    world.addComponent(galley, 'attackIntent', { targetId: inland.id! });
    step(200);
    world.removeComponent(galley, 'attackIntent');
    world.addComponent(galley, 'attackIntent', { targetId: shore.id! });
    step(100);
    expect(galley.movable!.path.length).toBeGreaterThan(0);
  });

  it('a ship waiting on an unreachable target spends no path searches', () => {
    const map = new MapData(30, 30, TERRAIN.grass);
    for (let ty = 0; ty < 30; ty++) for (let tx = 15; tx < 30; tx++) map.setTile(tx, ty, TERRAIN.water);
    const world = createEcsWorld();
    let searches = 0;
    const combat = new CombatSystem(world, map, null, { take: () => (searches++, true) });
    const galley = createUnit(world, { type: 'galley', tile: { tx: 22, ty: 10 }, playerId: 1 });
    const villager = createUnit(world, { type: 'villager', tile: { tx: 2, ty: 10 }, playerId: 2 });
    world.addComponent(galley, 'attackIntent', { targetId: villager.id! });
    for (let t = 0; t < NAVAL.shipUnreachableGiveUpMs + 2 * REPATH_RETRY_MS; t += 100) combat.update(100);
    expect(galley.attackIntent).toBeUndefined();
    expect(searches).toBe(0);
  });
});
