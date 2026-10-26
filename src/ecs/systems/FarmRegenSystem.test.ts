import { describe, expect, it } from 'vitest';
import { FARM_BALANCE } from '../../config/balance';
import { createPlayer } from '../../game/Player';
import { PlayerManager } from '../../game/PlayerManager';
import { MapData } from '../../map/MapData';
import { createBuilding } from '../archetypes/building';
import { createResourceNode } from '../archetypes/resource';
import { createVillager } from '../archetypes/villager';
import { createEcsWorld } from '../world';
import { ConstructionSystem } from './ConstructionSystem';
import { FarmRegenSystem } from './FarmRegenSystem';
import { GatheringSystem } from './GatheringSystem';
import { MovementSystem } from './MovementSystem';

function farmRig() {
  const map = new MapData(20, 20);
  const world = createEcsWorld();
  const player = createPlayer({ id: 2, resources: { food: 0, wood: 0, gold: 0 } });
  createBuilding(world, { type: 'town_center', origin: { tx: 5, ty: 5 }, playerId: 2, mapData: map });
  const farm = createBuilding(world, { type: 'farm', origin: { tx: 9, ty: 5 }, playerId: 2, mapData: map, underConstruction: true });
  farm.underConstruction!.elapsed = farm.underConstruction!.totalTime;
  const builder = createVillager(world, { tile: { tx: 8, ty: 5 }, playerId: 2 });
  world.addComponent(builder, 'buildCommand', { targetId: farm.id! });
  new ConstructionSystem(world, map).update(16);
  return { map, world, player, farm, builder, players: new PlayerManager([player]) };
}

describe('farms (§8.2 "175 food regenerable")', () => {
  it('a finished farm holds the spec capacity and regrows up to it', () => {
    const { world, farm } = farmRig();
    expect(farm.resourceNode).toEqual({ type: 'food', amount: FARM_BALANCE.capacity, maxAmount: FARM_BALANCE.capacity });
    farm.resourceNode!.amount = 10;
    const regen = new FarmRegenSystem(world);
    regen.update(10_000);
    expect(farm.resourceNode!.amount).toBeCloseTo(10 + FARM_BALANCE.regenPerSec * 10, 5);
    regen.update(3_600_000);
    expect(farm.resourceNode!.amount).toBe(FARM_BALANCE.capacity);
  });

  it('is never used up: its farmer stays through empty spells and keeps delivering food', () => {
    const { world, map, farm, builder, player, players } = farmRig();
    world.addComponent(builder, 'gatherIntent', { nodeId: farm.id! });
    const gathering = new GatheringSystem(world, map, players);
    const movement = new MovementSystem(world, players);
    const regen = new FarmRegenSystem(world);
    for (let t = 0; t < 30 * 60_000; t += 200) {
      gathering.update(200);
      movement.update(200);
      regen.update(200);
    }
    expect(farm.resourceNode).toBeDefined();
    expect(builder.gatherer!.targetNodeId).toBe(farm.id);
    // 30 min: the full 175 plus about 30 min of regrowth (less what is still in hand / on the farm).
    expect(player.resources.food).toBeGreaterThan(FARM_BALANCE.capacity + 0.8 * FARM_BALANCE.regenPerSec * 1800 - 200);
  });
});

describe('gatherers running out of food', () => {
  it('move on to a free own farm, never a farm somebody works or another player owns', () => {
    const { world, map, farm, builder, players } = farmRig();
    const foreign = createBuilding(world, { type: 'farm', origin: { tx: 12, ty: 9 }, playerId: 1, mapData: map });
    foreign.resourceNode = { type: 'food', amount: 175, maxAmount: 175 };
    builder.gatherer!.targetNodeId = farm.id; // the farm is taken
    const berry = createResourceNode(world, { tile: { tx: 12, ty: 12 }, type: 'food', amount: 1 });
    const v = createVillager(world, { tile: { tx: 12, ty: 11 }, playerId: 2 });
    world.addComponent(v, 'gatherIntent', { nodeId: berry.id! });
    const gathering = new GatheringSystem(world, map, players);
    for (let i = 0; i < 20; i++) gathering.update(200);
    // The bush ran out; the taken farm and the foreign farm are skipped, nothing else is left.
    expect(v.gatherer!.targetNodeId).toBeUndefined();
    builder.gatherer!.targetNodeId = undefined; // the farm frees up
    const berry2 = createResourceNode(world, { tile: { tx: 13, ty: 12 }, type: 'food', amount: 1 });
    world.addComponent(v, 'gatherIntent', { nodeId: berry2.id! });
    for (let i = 0; i < 20; i++) gathering.update(200);
    expect(v.gatherer!.targetNodeId).toBe(farm.id);
  });
});
