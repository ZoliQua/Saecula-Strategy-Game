import { convertUnit } from '../game/convert';
import { describe, expect, it } from 'vitest';
import { TIME_VICTORY } from '../config/balance';
import { createBuilding, unblockBuilding } from '../ecs/archetypes/building';
import { createUnit } from '../ecs/archetypes/createUnit';
import { FogOfWarSystem } from '../ecs/systems/FogOfWarSystem';
import { MovementSystem } from '../ecs/systems/MovementSystem';
import { PathfindingSystem } from '../ecs/systems/PathfindingSystem';
import { createEcsWorld } from '../ecs/world';
import { createPlayer } from '../game/Player';
import { FogOfWarData } from '../map/FogOfWarData';
import { MapData } from '../map/MapData';
import { createRng } from '../map/random';
import type { AIContext } from './AIPlayer';
import { ArmyControl } from './ArmyControl';
import { Perception } from './perception';
import { ThoughtLog } from './thoughts';

describe('ArmyControl', () => {
  it('a wave sent at a remembered building that vanished in the fog walks there, sees it gone and retargets', () => {
    const map = new MapData(48, 48);
    const world = createEcsWorld();
    const fog = new FogOfWarData(48, 48);
    createBuilding(world, { type: 'town_center', origin: { tx: 2, ty: 2 }, playerId: 2, mapData: map });
    const army = Array.from({ length: 6 }, (_, i) => createUnit(world, { type: 'swordsman', tile: { tx: 6 + i, ty: 6 }, playerId: 2 }));
    const goneTc = createBuilding(world, { type: 'town_center', origin: { tx: 30, ty: 30 }, playerId: 1, mapData: map });
    const house = createBuilding(world, { type: 'house', origin: { tx: 30, ty: 10 }, playerId: 1, mapData: map });
    const ctx: AIContext = { world, mapData: map, player: createPlayer({ id: 2 }), timeMs: 0, fog, enemyPlayerId: 1 };
    const perception = new Perception();
    // Earlier scouting saw both enemy buildings; then the fog closed over them.
    fog.markVisible(31, 31);
    fog.markVisible(30, 10);
    perception.update(ctx);
    fog.dimVisibleToExplored();
    // The TC is destroyed while out of sight.
    unblockBuilding(map, goneTc);
    world.remove(goneTc);

    const control = new ArmyControl(new ThoughtLog(), createRng(3));
    const fogSystem = new FogOfWarSystem(world, fog, 2);
    fogSystem.update(0);
    control.launchWave(ctx, perception.update(ctx));
    // Not an attack order on a missing id (that would be dropped and freeze the wave): a march.
    expect(army.every((u) => !u.attackIntent && u.moveIntent?.target.tx === 30 && u.moveIntent.target.ty === 30)).toBe(true);

    const pathing = new PathfindingSystem(world, map);
    const movement = new MovementSystem(world);
    let t = 0;
    for (; t < 60_000 && !army.some((u) => u.attackIntent?.targetId === house.id); t += 200) {
      pathing.update();
      movement.update(200);
      fogSystem.update(200);
      if (t % 1000 === 0) control.update({ ...ctx, timeMs: t }, perception.update({ ...ctx, timeMs: t }));
    }
    expect(perception.update(ctx).knownEnemyBuildings.map((b) => b.id)).toEqual([house.id]);
    expect(army.some((u) => u.attackIntent?.targetId === house.id || u.moveIntent?.target.ty === 10)).toBe(true);
  });

  it('the score leader launches no wave in the time limit\'s final window; a trailing AI still does', () => {
    const map = new MapData(32, 32);
    const world = createEcsWorld();
    const fog = new FogOfWarData(32, 32);
    createBuilding(world, { type: 'town_center', origin: { tx: 2, ty: 2 }, playerId: 2, mapData: map });
    createBuilding(world, { type: 'town_center', origin: { tx: 24, ty: 24 }, playerId: 1, mapData: map });
    const army = Array.from({ length: 5 }, (_, i) => createUnit(world, { type: 'swordsman', tile: { tx: 6 + i, ty: 6 }, playerId: 2 }));
    fog.markVisible(25, 25);
    const base: AIContext = { world, mapData: map, player: createPlayer({ id: 2 }), timeMs: 0, fog, enemyPlayerId: 1 };
    const send = (timeVictory: AIContext['timeVictory']) => {
      const control = new ArmyControl(new ThoughtLog(), createRng(3));
      const ctx = { ...base, ...(timeVictory && { timeVictory }) };
      return control.launchWave(ctx, new Perception().update(ctx));
    };
    expect(send({ remainingMs: TIME_VICTORY.holdLeadMs, leaderId: 2 })).toBe(0);
    expect(army.every((u) => !u.moveIntent && !u.attackIntent)).toBe(true);
    expect(send({ remainingMs: TIME_VICTORY.holdLeadMs + 1, leaderId: 2 })).toBe(5);
    expect(send({ remainingMs: 1000, leaderId: 1 })).toBe(5);
    expect(send(undefined)).toBe(5);
  });

  it('a wave member converted away (M11) leaves the wave and keeps its new owner\'s orders', () => {
    const map = new MapData(48, 48);
    const world = createEcsWorld();
    const fog = new FogOfWarData(48, 48);
    createBuilding(world, { type: 'town_center', origin: { tx: 2, ty: 2 }, playerId: 2, mapData: map });
    createBuilding(world, { type: 'town_center', origin: { tx: 36, ty: 36 }, playerId: 1, mapData: map });
    const army = Array.from({ length: 6 }, (_, i) => createUnit(world, { type: 'swordsman', tile: { tx: 10 + i, ty: 10 }, playerId: 2 }));
    fog.markVisible(37, 37);
    const ctx: AIContext = { world, mapData: map, player: createPlayer({ id: 2 }), timeMs: 0, fog, enemyPlayerId: 1 };
    const perception = new Perception();
    const control = new ArmyControl(new ThoughtLog(), createRng(3));
    control.launchWave(ctx, perception.update(ctx));
    const turned = army[0]!;
    convertUnit(world, turned, 1, () => 'english');
    world.addComponent(turned, 'moveIntent', { target: { tx: 5, ty: 40 } });
    control.update(ctx, perception.update(ctx));
    expect(control.members().has(turned.id!)).toBe(false);
    expect(control.members().size).toBe(5);
    expect(turned.moveIntent?.target).toEqual({ tx: 5, ty: 40 });
    expect(turned.attackIntent).toBeUndefined();
  });
});
