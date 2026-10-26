import { describe, expect, it } from 'vitest';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { createBuilding } from '../archetypes/building';
import { createUnit } from '../archetypes/createUnit';
import { createWall } from '../archetypes/wall';
import type { Entity } from '../components';
import { createEcsWorld } from '../world';
import { CombatSystem } from './CombatSystem';
import { DeathSystem } from './DeathSystem';
import { MovementSystem } from './MovementSystem';

/** A house at (12,7) fully ringed by enemy walls (x 11..14, y 6..9). */
function walledCamp(wallOwner = 2) {
  const map = new MapData(24, 16, TERRAIN.grass);
  const world = createEcsWorld();
  const house = createBuilding(world, { type: 'house', origin: { tx: 12, ty: 7 }, playerId: 2, mapData: map });
  const walls: Entity[] = [];
  for (let x = 11; x <= 14; x++) {
    for (let y = 6; y <= 9; y++) {
      const ring = x === 11 || x === 14 || y === 6 || y === 9;
      if (ring) walls.push(createWall(world, { tile: { tx: x, ty: y }, playerId: wallOwner, mapData: map }));
    }
  }
  const sword = createUnit(world, { type: 'swordsman', tile: { tx: 3, ty: 8 }, playerId: 1 });
  const systems = { combat: new CombatSystem(world, map), movement: new MovementSystem(world), death: new DeathSystem(world, map) };
  const run = (ms: number, step = 100) => {
    for (let t = 0; t < ms; t += step) {
      systems.combat.update(step);
      systems.movement.update(step);
      systems.death.update(step);
    }
  };
  return { map, world, house, walls, sword, run };
}

describe('wall breach', () => {
  it('a unit stalled outside enemy walls attacks the blocking wall, then resumes its target', () => {
    const { world, house, walls, sword, run } = walledCamp();
    world.addComponent(sword, 'attackIntent', { targetId: house.id! });
    run(8_000);
    // Walked up to the ring and switched to a wall segment, remembering the house.
    const breachId = sword.attackIntent?.targetId;
    expect(walls.some((w) => w.id === breachId)).toBe(true);
    expect(sword.attackIntent?.resumeTargetId).toBe(house.id);
    // Wear the wall down quickly: it dies, the unit goes back to the house.
    const wall = walls.find((w) => w.id === breachId)!;
    wall.health!.current = 1;
    run(4_000);
    expect(world.entities.includes(wall)).toBe(false);
    expect(sword.attackIntent?.targetId).toBe(house.id);
    expect(sword.attackIntent?.resumeTargetId).toBeUndefined();
    run(10_000);
    expect(house.health!.current).toBeLessThan(house.health!.max);
  });

  it('never breaches through its own walls', () => {
    const { world, house, sword, run } = walledCamp(1);
    world.addComponent(sword, 'attackIntent', { targetId: house.id! });
    run(8_000);
    expect(sword.attackIntent?.targetId).toBe(house.id);
    expect(house.health!.current).toBe(house.health!.max);
  });
});
