import { describe, expect, it } from 'vitest';
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
});
