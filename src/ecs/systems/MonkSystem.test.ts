import { describe, expect, it } from 'vitest';
import type { CivId } from '../../types';
import { MONK, REPATH_RETRY_MS } from '../../config/balance';
import { TERRAIN } from '../../map/TerrainTypes';
import { gameEvents } from '../../game/events';
import { MapData } from '../../map/MapData';
import { createUnit } from '../archetypes/createUnit';
import { createBuilding } from '../archetypes/building';
import { createEcsWorld } from '../world';
import { MovementSystem } from './MovementSystem';
import { PathfindingSystem } from './PathfindingSystem';
import { MonkSystem } from './MonkSystem';

const civOf = (id: number): CivId => (id === 1 ? 'hungarian' : 'english');

function setup() {
  const map = new MapData(40, 40);
  const world = createEcsWorld();
  const monks = new MonkSystem(world, civOf);
  const pathing = new PathfindingSystem(world, map);
  const movement = new MovementSystem(world);
  const step = (ms: number, dt = 100) => {
    for (let t = 0; t < ms; t += dt) {
      pathing.update();
      movement.update(dt);
      monks.update(dt);
    }
  };
  return { map, world, monks, step };
}

describe('MonkSystem', () => {
  it('an idle monk heals the most wounded own unit in range, in whole HP, never above max', () => {
    const { world, step } = setup();
    createUnit(world, { type: 'monk', tile: { tx: 10, ty: 10 }, playerId: 1 });
    const light = createUnit(world, { type: 'swordsman', tile: { tx: 12, ty: 10 }, playerId: 1 });
    const heavy = createUnit(world, { type: 'archer', tile: { tx: 10, ty: 13 }, playerId: 1 });
    const far = createUnit(world, { type: 'archer', tile: { tx: 10, ty: 10 + MONK.healRange + 1 }, playerId: 1 });
    const enemy = createUnit(world, { type: 'archer', tile: { tx: 11, ty: 11 }, playerId: 2 });
    light.health!.current = light.health!.max - 2;
    heavy.health!.current = 5;
    far.health!.current = 5;
    enemy.health!.current = 5;
    step(2000);
    expect(heavy.health!.current).toBe(5 + Math.floor(MONK.healPerSec * 2));
    expect(light.health!.current).toBe(light.health!.max - 2);
    expect(far.health!.current).toBe(5);
    expect(enemy.health!.current).toBe(5);
    step(60_000);
    expect(heavy.health!.current).toBe(heavy.health!.max);
    expect(light.health!.current).toBe(light.health!.max);
    expect(Number.isInteger(light.health!.current)).toBe(true);
  });

  it('converts an enemy unit after walking into range and channelling, then recharges', () => {
    const { world, step } = setup();
    const monk = createUnit(world, { type: 'monk', tile: { tx: 5, ty: 5 }, playerId: 1 });
    const knight = createUnit(world, { type: 'knight', tile: { tx: 5 + MONK.convertRange + 6, ty: 5 }, playerId: 2 });
    const events: unknown[] = [];
    const off = gameEvents.on('unitConverted', (e) => events.push({ ...e, world: undefined }));
    world.addComponent(monk, 'convertIntent', { targetId: knight.id!, elapsedMs: 0 });
    for (let t = 0; t < 30_000 && knight.owner!.playerId === 2; t += 100) step(100);
    off();
    expect(knight.owner!.playerId).toBe(1);
    expect(knight.originCiv).toEqual({ civ: 'english' });
    expect(monk.convertIntent).toBeUndefined();
    expect(monk.converter!.rechargeMs).toBeGreaterThan(0);
    expect(Math.max(Math.abs(monk.position!.tx - knight.position!.tx), Math.abs(monk.position!.ty - knight.position!.ty))).toBeLessThanOrEqual(MONK.convertRange);
    expect(events).toEqual([{ world: undefined, entityId: knight.id, fromPlayerId: 2, toPlayerId: 1, unitType: 'knight' }]);
  });

  it('channelling takes convertTimeMs and restarts when the target escapes', () => {
    const { world, monks } = setup();
    const monk = createUnit(world, { type: 'monk', tile: { tx: 5, ty: 5 }, playerId: 1 });
    const archer = createUnit(world, { type: 'archer', tile: { tx: 8, ty: 5 }, playerId: 2 });
    world.addComponent(monk, 'convertIntent', { targetId: archer.id!, elapsedMs: 0 });
    monks.update(MONK.convertTimeMs - 100);
    expect(archer.owner!.playerId).toBe(2);
    expect(monk.converter!.busy).toBe(true);
    archer.position = { tx: 5 + MONK.convertRange + 3, ty: 5 };
    monks.update(100);
    expect(monk.convertIntent?.elapsedMs).toBe(0);
    expect(monk.moveIntent).toBeDefined();
    archer.position = { tx: 8, ty: 5 };
    monks.update(MONK.convertTimeMs - 100);
    expect(archer.owner!.playerId).toBe(2);
    monks.update(100);
    expect(archer.owner!.playerId).toBe(1);
  });

  it('refuses monks, buildings, own units and Gaia, and a recharging monk drops its order', () => {
    const { map, world, monks } = setup();
    const monk = createUnit(world, { type: 'monk', tile: { tx: 5, ty: 5 }, playerId: 1 });
    const targets = [
      createUnit(world, { type: 'monk', tile: { tx: 7, ty: 5 }, playerId: 2 }),
      createBuilding(world, { type: 'house', origin: { tx: 7, ty: 7 }, playerId: 2, mapData: map }),
      createUnit(world, { type: 'archer', tile: { tx: 6, ty: 6 }, playerId: 1 }),
      createUnit(world, { type: 'archer', tile: { tx: 6, ty: 4 }, playerId: 0 }),
    ];
    for (const t of targets) {
      world.addComponent(monk, 'convertIntent', { targetId: t.id!, elapsedMs: 0 });
      monks.update(MONK.convertTimeMs + 100);
      expect(monk.convertIntent, t.unit?.unitType ?? t.building?.type).toBeUndefined();
    }
    expect(targets.map((t) => t.owner!.playerId)).toEqual([2, 2, 1, 0]);
    const archer = createUnit(world, { type: 'archer', tile: { tx: 6, ty: 5 }, playerId: 2 });
    monk.converter!.rechargeMs = 1000;
    world.addComponent(monk, 'convertIntent', { targetId: archer.id!, elapsedMs: 0 });
    monks.update(100);
    expect(monk.convertIntent).toBeUndefined();
    expect(archer.owner!.playerId).toBe(2);
  });

  it('a converted unit drops its orders and selection', () => {
    const { world, monks } = setup();
    const monk = createUnit(world, { type: 'monk', tile: { tx: 5, ty: 5 }, playerId: 1 });
    const archer = createUnit(world, { type: 'archer', tile: { tx: 7, ty: 5 }, playerId: 2 });
    archer.selectable!.selected = true;
    world.addComponent(archer, 'attackIntent', { targetId: monk.id! });
    world.addComponent(monk, 'convertIntent', { targetId: archer.id!, elapsedMs: 0 });
    monks.update(MONK.convertTimeMs);
    expect(archer.owner!.playerId).toBe(1);
    expect(archer.attackIntent).toBeUndefined();
    expect(archer.selectable!.selected).toBe(false);
  });

  it('a monk ordered onto an unreachable target retries its path only every REPATH_RETRY_MS, not every frame', () => {
    const { map, world, step } = setup();
    // The target stands on an island: water all around it, out of convert range of the shore.
    for (let ty = 14; ty <= 32; ty++) for (let tx = 14; tx <= 32; tx++) map.setTile(tx, ty, TERRAIN.water);
    map.setTile(23, 23, TERRAIN.grass);
    const monk = createUnit(world, { type: 'monk', tile: { tx: 5, ty: 23 }, playerId: 1 });
    const archer = createUnit(world, { type: 'archer', tile: { tx: 23, ty: 23 }, playerId: 2 });
    world.addComponent(monk, 'convertIntent', { targetId: archer.id!, elapsedMs: 0 });
    step(15_000); // walk to the shore and settle
    let orders = 0;
    const add = world.addComponent.bind(world);
    (world as unknown as { addComponent: typeof add }).addComponent = ((e, c, v) => {
      if (c === 'moveIntent') orders++;
      return add(e, c, v);
    }) as typeof add;
    step(6000);
    expect(monk.convertIntent).toBeDefined();
    expect(orders).toBeLessThanOrEqual(Math.ceil(6000 / REPATH_RETRY_MS) + 1);
  });
});

