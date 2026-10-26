import { beforeEach, describe, expect, it } from 'vitest';
import { GATHER_RETARGET_RADIUS } from '../../config/balance';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { uiStore } from '../../ui/store';
import { createBuilding } from '../archetypes/building';
import { createResourceNode } from '../archetypes/resource';
import { createVillager } from '../archetypes/villager';
import { createEcsWorld } from '../world';
import { GatheringSystem } from './GatheringSystem';
import { MovementSystem } from './MovementSystem';

function setup() {
  // Small map: TC at (0,0) 3x3, tree at (5,5), villager at (4,5).
  const map = new MapData(16, 16, TERRAIN.grass);
  map.setTile(5, 5, TERRAIN.forest);
  const world = createEcsWorld();
  createBuilding(world, {
    type: 'town_center',
    origin: { tx: 0, ty: 0 },
    playerId: 1,
    mapData: map,
  });
  const tree = createResourceNode(world, {
    tile: { tx: 5, ty: 5 },
    type: 'wood',
    amount: 5,
  });
  const villager = createVillager(world, { tile: { tx: 4, ty: 5 } });
  const system = new GatheringSystem(world, map);
  return { map, world, tree, villager, system };
}

describe('GatheringSystem', () => {
  beforeEach(() => {
    uiStore.setState({
      resources: { food: 0, wood: 0, gold: 0 },
    });
  });

  it('gathers when villager is adjacent to a tree', () => {
    const { system, villager, tree } = setup();
    villager.gatherIntent = { nodeId: tree.id! };
    // Trigger the intent; villager already adjacent so we expect gather.
    system.update(1000); // 1s * 0.6 rate = 0.6 wood
    expect(villager.gatherer!.carrying).toBeCloseTo(0.6, 5);
    expect(villager.gatherer!.carryingType).toBe('wood');
    expect(tree.resourceNode!.amount).toBeCloseTo(5 - 0.6, 5);
  });

  it('fills up and heads to the dropoff', () => {
    const { system, villager, tree } = setup();
    villager.gatherer!.capacity = 2;
    villager.gatherIntent = { nodeId: tree.id! };

    // Gather until full (capacity=2 at rate 0.6 → ~3.4s).
    system.update(4000);
    expect(villager.gatherer!.carrying).toBeCloseTo(2, 5);
    // Villager should have queued a path toward the town center.
    expect(villager.movable!.path.length).toBeGreaterThan(0);
  });

  it('depletes the node and reverts terrain', () => {
    const { system, villager, tree, map } = setup();
    tree.resourceNode!.amount = 0.5;
    villager.gatherer!.capacity = 20;
    villager.gatherIntent = { nodeId: tree.id! };
    system.update(2000);
    expect(tree.resourceNode!.amount).toBeCloseTo(0, 5);
    expect(map.getTile(5, 5)).toBe(TERRAIN.grass);
  });

  it('drops off when adjacent to the town center', () => {
    const { system, villager } = setup();
    villager.position = { tx: 3, ty: 1 };
    villager.gatherer!.capacity = 5;
    villager.gatherer!.carrying = 5;
    villager.gatherer!.carryingType = 'wood';
    system.update(50);
    expect(uiStore.getState().resources.wood).toBe(5);
    expect(villager.gatherer!.carrying).toBe(0);
    expect(villager.gatherer!.carryingType).toBeNull();
  });

  it('a villager sent to new work with a partial load of another type drops it off first (no ping-pong)', () => {
    const { map, world, system, villager } = setup();
    // Gold one tile off the TC's corner ring: (3,3) touches the TC, (3,4) touches the mine.
    map.setTile(4, 5, TERRAIN.gold_mine);
    const mine = createResourceNode(world, { tile: { tx: 4, ty: 5 }, type: 'gold', amount: 100 });
    villager.position = { tx: 3, ty: 3 };
    villager.gatherer!.carrying = 3;
    villager.gatherer!.carryingType = 'wood';
    villager.gatherIntent = { nodeId: mine.id! };
    const movement = new MovementSystem(world);
    for (let i = 0; i < 100; i++) {
      system.update(100);
      movement.update(100);
    }
    expect(uiStore.getState().resources.wood).toBe(3);
    expect(villager.gatherer!.carryingType).toBe('gold');
    expect(villager.gatherer!.carrying).toBeGreaterThan(1);
  });

  it('after its node runs out, a gatherer moves on to a nearby node of the same type but never across the map', () => {
    const map = new MapData(64, 16, TERRAIN.grass);
    const world = createEcsWorld();
    for (const tx of [5, 7, 60]) map.setTile(tx, 5, TERRAIN.forest);
    const first = createResourceNode(world, { tile: { tx: 5, ty: 5 }, type: 'wood', amount: 0.5 });
    const near = createResourceNode(world, { tile: { tx: 7, ty: 5 }, type: 'wood', amount: 0.5 });
    const far = createResourceNode(world, { tile: { tx: 60, ty: 5 }, type: 'wood' });
    const villager = createVillager(world, { tile: { tx: 6, ty: 5 } });
    villager.gatherer!.capacity = 20;
    const system = new GatheringSystem(world, map);
    villager.gatherIntent = { nodeId: first.id! };
    for (let i = 0; i < 10; i++) system.update(100);
    expect(first.resourceNode!.amount).toBeCloseTo(0, 5);
    // The nearby tree is next (within GATHER_RETARGET_RADIUS)...
    expect(villager.gatherer!.targetNodeId).toBe(near.id);
    for (let i = 0; i < 10; i++) system.update(100);
    // ...but once the patch is gone, the lone tree 53 tiles away is not.
    expect(near.resourceNode!.amount).toBeCloseTo(0, 5);
    expect(villager.gatherer!.targetNodeId).not.toBe(far.id);
    expect(GATHER_RETARGET_RADIUS).toBeLessThan(53);
  });
});
