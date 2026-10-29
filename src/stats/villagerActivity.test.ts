import { describe, expect, it } from 'vitest';
import { createBuilding } from '../ecs/archetypes/building';
import { createResourceNode } from '../ecs/archetypes/resource';
import { createVillager } from '../ecs/archetypes/villager';
import { createUnit } from '../ecs/archetypes/createUnit';
import type { Entity } from '../ecs/components';
import { createEcsWorld } from '../ecs/world';
import { MapData } from '../map/MapData';
import { villagerActivity } from './villagerActivity';

describe('villagerActivity', () => {
  it('one villager per category gives one in each row', () => {
    const world = createEcsWorld();
    const map = new MapData(32, 32);
    const node = (type: 'food' | 'wood' | 'gold', tx: number) => createResourceNode(world, { type, tile: { tx, ty: 20 } });
    const gatherer = (n: Entity, tx: number) => {
      const v = createVillager(world, { tile: { tx, ty: 10 } });
      v.gatherer!.targetNodeId = n.id;
      return v;
    };
    const food = gatherer(node('food', 1), 1);
    const wood = gatherer(node('wood', 2), 2);
    const gold = gatherer(node('gold', 3), 3);
    const site = createBuilding(world, { type: 'house', origin: { tx: 20, ty: 20 }, playerId: 1, mapData: map, underConstruction: true });
    const builder = createVillager(world, { tile: { tx: 4, ty: 10 } });
    world.addComponent(builder, 'buildCommand', { targetId: site.id! });
    const idle = createVillager(world, { tile: { tx: 5, ty: 10 } });
    const walker = createVillager(world, { tile: { tx: 6, ty: 10 } });
    walker.movable!.path = [{ tx: 7, ty: 10 }];
    // Not counted: a soldier, another player's villager, a dying villager.
    createUnit(world, { type: 'swordsman', tile: { tx: 8, ty: 10 }, playerId: 1 });
    createVillager(world, { tile: { tx: 9, ty: 10 }, playerId: 2 });
    const dead = createVillager(world, { tile: { tx: 10, ty: 10 } });
    world.addComponent(dead, 'dying', { ttlMs: 100 });

    expect(villagerActivity(world, 1)).toEqual({
      food: [food.id],
      wood: [wood.id],
      gold: [gold.id],
      build: [builder.id],
      idle: [idle.id],
      other: [walker.id],
    });
  });
});
