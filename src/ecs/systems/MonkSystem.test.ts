import { describe, expect, it } from 'vitest';
import type { CivId } from '../../types';
import { MONK } from '../../config/balance';
import { clearUnitOrders } from '../orders';
import { TERRAIN } from '../../map/TerrainTypes';
import { takeConvertGivenUp } from '../../game/convert';
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
  const monks = new MonkSystem(world, map, civOf);
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
    expect(monk.movable!.path.length).toBeGreaterThan(0);
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

  /** A map whose middle is water with a grass island of `r` tiles around (23, 23), far beyond convert range of the shore. */
  function island(map: MapData, r = 0): void {
    for (let ty = 10; ty <= 36; ty++) for (let tx = 10; tx <= 36; tx++) map.setTile(tx, ty, TERRAIN.water);
    for (let ty = 23 - r; ty <= 23 + r; ty++) for (let tx = 23 - r; tx <= 23 + r; tx++) map.setTile(tx, ty, TERRAIN.grass);
  }

  it('a monk ordered onto an unreachable target gives up at once, without walking (M11 review)', () => {
    const { map, world, step } = setup();
    island(map);
    const monk = createUnit(world, { type: 'monk', tile: { tx: 4, ty: 23 }, playerId: 1 });
    const archer = createUnit(world, { type: 'archer', tile: { tx: 23, ty: 23 }, playerId: 2 });
    world.addComponent(monk, 'convertIntent', { targetId: archer.id!, elapsedMs: 0 });
    step(100);
    expect(monk.convertIntent).toBeUndefined();
    expect(monk.moveIntent).toBeUndefined();
    expect(monk.position).toEqual({ tx: 4, ty: 23 });
    expect(takeConvertGivenUp(monk)).toBe(archer.id);
  });

  it('giving up on blocked ground still steps the monk off it (never left stuck, M7)', () => {
    const { map, world, monks } = setup();
    island(map);
    const monk = createUnit(world, { type: 'monk', tile: { tx: 4, ty: 23 }, playerId: 1 });
    const archer = createUnit(world, { type: 'archer', tile: { tx: 23, ty: 23 }, playerId: 2 });
    map.setTile(4, 23, TERRAIN.water);
    world.addComponent(monk, 'convertIntent', { targetId: archer.id!, elapsedMs: 0 });
    monks.update(16);
    expect(monk.convertIntent).toBeUndefined();
    const end = monk.movable!.path.at(-1);
    expect(end && map.isPassable(end.tx, end.ty)).toBe(true);
  });

  it('steps off blocked ground on the side of its target (the other side is cut off)', () => {
    const { map, world, monks } = setup();
    for (let ty = 0; ty < 40; ty++) map.setTile(20, ty, TERRAIN.water);
    // Only the wall row the monks stand in matters; seal the rows apart so the other side cannot be walked round.
    for (let tx = 0; tx < 40; tx++) map.setTile(tx, 10, TERRAIN.water);
    for (const side of [1, -1]) {
      const monk = createUnit(world, { type: 'monk', tile: { tx: 20, ty: 5 + side * 10 + 10 }, playerId: 1 });
      const archer = createUnit(world, { type: 'archer', tile: { tx: 20 + side * 8, ty: 5 + side * 10 + 10 }, playerId: 2 });
      world.addComponent(monk, 'convertIntent', { targetId: archer.id!, elapsedMs: 0 });
      monks.update(16);
      expect(monk.convertIntent, `side ${side}`).toBeDefined();
      expect(Math.sign(monk.movable!.path.at(-1)!.tx - 20), `side ${side}`).toBe(side);
    }
  });

  it('gives up on an unreachable target that keeps moving too', () => {
    const { map, world, step } = setup();
    island(map, 3);
    const monk = createUnit(world, { type: 'monk', tile: { tx: 4, ty: 23 }, playerId: 1 });
    const archer = createUnit(world, { type: 'archer', tile: { tx: 20, ty: 20 }, playerId: 2 });
    world.addComponent(monk, 'convertIntent', { targetId: archer.id!, elapsedMs: 0 });
    const spots = [{ tx: 20, ty: 20 }, { tx: 26, ty: 26 }, { tx: 20, ty: 26 }, { tx: 26, ty: 20 }];
    for (let s = 0; s < 40 && monk.convertIntent; s++) {
      archer.position = { ...spots[s % spots.length]! };
      step(1000);
    }
    expect(monk.convertIntent).toBeUndefined();
    // Giving up is told (the AI avoids that target) and stops the monk: no leftover walk toward the target.
    expect(takeConvertGivenUp(monk)).toBe(archer.id);
    expect(takeConvertGivenUp(monk)).toBeUndefined();
    expect(monk.moveIntent).toBeUndefined();
    expect(monk.movable?.path).toEqual([]);
  });

  it('does not give up a reachable target behind a long detour, even while the target drifts', () => {
    const { map, world, step } = setup();
    // A water wall between them with one gap far to the south: the way round is long.
    for (let ty = 0; ty < 36; ty++) map.setTile(20, ty, TERRAIN.water);
    const monk = createUnit(world, { type: 'monk', tile: { tx: 10, ty: 5 }, playerId: 1 });
    const archer = createUnit(world, { type: 'archer', tile: { tx: 28, ty: 5 }, playerId: 2 });
    world.addComponent(monk, 'convertIntent', { targetId: archer.id!, elapsedMs: 0 });
    const ownerOf = (): number => archer.owner!.playerId;
    for (let s = 0; s < 90 && ownerOf() === 2; s++) {
      archer.position = { tx: 28 + (s % 2) * 3, ty: 5 + (s % 3) };
      step(1000);
      expect(monk.convertIntent !== undefined || ownerOf() === 1, `second ${s}`).toBe(true);
    }
    expect(ownerOf()).toBe(1);
  });

  it('walks to a reachable tile within range even when the straight-line nearest one is out of range', () => {
    const { map, world, step } = setup();
    for (let ty = 0; ty < 40; ty++) for (let tx = 0; tx < 40; tx++) map.setTile(tx, ty, TERRAIN.water);
    for (let tx = 0; tx <= 20; tx++) map.setTile(tx, 0, TERRAIN.grass);
    for (let ty = 0; ty <= 23; ty++) map.setTile(20, ty, TERRAIN.grass);
    for (let ty = 0; ty <= 24; ty++) map.setTile(14, ty, TERRAIN.grass);
    map.setTile(20, 30, TERRAIN.grass);
    // (20, 23) is nearest to the target in a straight line but 7 tiles off; (14, 24) is within range 6.
    const monk = createUnit(world, { type: 'monk', tile: { tx: 0, ty: 0 }, playerId: 1 });
    const archer = createUnit(world, { type: 'archer', tile: { tx: 20, ty: 30 }, playerId: 2 });
    world.addComponent(monk, 'convertIntent', { targetId: archer.id!, elapsedMs: 0 });
    step(120_000);
    expect(archer.owner!.playerId).toBe(1);
  });

  it('plans its walk only with a path search from the shared budget', () => {
    const { map, world } = setup();
    const none = { take: () => false };
    const monks = new MonkSystem(world, map, civOf, undefined, none);
    const monk = createUnit(world, { type: 'monk', tile: { tx: 2, ty: 2 }, playerId: 1 });
    const archer = createUnit(world, { type: 'archer', tile: { tx: 30, ty: 30 }, playerId: 2 });
    world.addComponent(monk, 'convertIntent', { targetId: archer.id!, elapsedMs: 0 });
    monks.update(16);
    expect(monk.movable!.path).toEqual([]);
    expect(monk.moveIntent).toBeUndefined();
    expect(monk.convertIntent).toBeDefined();
  });

  it('arrives within range of a target that drifted less than retargetTiles meanwhile', () => {
    const { world, step } = setup();
    const monk = createUnit(world, { type: 'monk', tile: { tx: 2, ty: 20 }, playerId: 1 });
    const archer = createUnit(world, { type: 'archer', tile: { tx: 20, ty: 20 }, playerId: 2 });
    world.addComponent(monk, 'convertIntent', { targetId: archer.id!, elapsedMs: 0 });
    step(100);
    archer.position = { tx: 20 + MONK.retargetTiles - 1, ty: 20 };
    for (let t = 0; t < 60_000 && (monk.movable!.path.length > 0 || monk.moveIntent); t += 100) step(100);
    const d = Math.max(Math.abs(monk.position!.tx - archer.position.tx), Math.abs(monk.position!.ty - archer.position.ty));
    expect(d).toBeLessThanOrEqual(MONK.convertRange);
  });

  it('stops a step inside its range on open ground, so a one-tile shuffle does not break the channel', () => {
    const { world, monks } = setup();
    const monk = createUnit(world, { type: 'monk', tile: { tx: 2, ty: 20 }, playerId: 1 });
    const archer = createUnit(world, { type: 'archer', tile: { tx: 30, ty: 20 }, playerId: 2 });
    world.addComponent(monk, 'convertIntent', { targetId: archer.id!, elapsedMs: 0 });
    monks.update(16);
    const end = monk.movable!.path.at(-1)!;
    expect(Math.max(Math.abs(end.tx - 30), Math.abs(end.ty - 20))).toBe(MONK.convertRange - 1);
  });

  it('keeps chasing a reachable target that walks away slower than it (progress is not a failure)', () => {
    const { world, step } = setup();
    const monk = createUnit(world, { type: 'monk', tile: { tx: 2, ty: 2 }, playerId: 1 });
    const archer = createUnit(world, { type: 'archer', tile: { tx: 14, ty: 2 }, playerId: 2 });
    world.addComponent(monk, 'convertIntent', { targetId: archer.id!, elapsedMs: 0 });
    for (let s = 0; s < 8; s++) {
      archer.position = { tx: Math.min(38, archer.position!.tx + 1), ty: 2 };
      step(1000);
    }
    expect(monk.convertIntent).toBeDefined();
  });

  it('a new conversion order on the same target moves at once, toward a tile within range', () => {
    const { world, monks } = setup();
    const monk = createUnit(world, { type: 'monk', tile: { tx: 2, ty: 2 }, playerId: 1 });
    const archer = createUnit(world, { type: 'archer', tile: { tx: 30, ty: 30 }, playerId: 2 });
    world.addComponent(monk, 'convertIntent', { targetId: archer.id!, elapsedMs: 0 });
    monks.update(16);
    const first = monk.movable!.path;
    expect(first.length).toBeGreaterThan(0);
    // The player clicks the same target again: a new plan at once.
    clearUnitOrders(world, monk);
    world.addComponent(monk, 'convertIntent', { targetId: archer.id!, elapsedMs: 0 });
    monks.update(16);
    expect(monk.movable!.path).not.toBe(first);
    const to = monk.movable!.path.at(-1)!;
    expect(Math.max(Math.abs(to.tx - 30), Math.abs(to.ty - 30))).toBeLessThanOrEqual(MONK.convertRange);
  });
});

