import { describe, expect, it } from 'vitest';
import { NAVAL } from '../../config/balance';
import { createPlayer } from '../../game/Player';
import { PlayerManager } from '../../game/PlayerManager';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { createBuilding } from '../archetypes/building';
import { createUnit } from '../archetypes/createUnit';
import { createResourceNode } from '../archetypes/resource';
import { createVillager } from '../archetypes/villager';
import { createEcsWorld } from '../world';
import { GatheringSystem } from './GatheringSystem';
import { MovementSystem } from './MovementSystem';
import { PathfindingSystem } from './PathfindingSystem';

/** Land on the west (x < 15), sea on the east, a dock on the shore and a fish school out at sea. */
function setup() {
  const map = new MapData(30, 30, TERRAIN.grass);
  for (let ty = 0; ty < 30; ty++) for (let tx = 15; tx < 30; tx++) map.setTile(tx, ty, TERRAIN.water);
  const world = createEcsWorld();
  const players = new PlayerManager([createPlayer({ id: 1 })]);
  const dock = createBuilding(world, { type: 'dock', origin: { tx: 12, ty: 10 }, playerId: 1, mapData: map });
  const tc = createBuilding(world, { type: 'town_center', origin: { tx: 3, ty: 3 }, playerId: 1, mapData: map });
  map.setTile(22, 11, TERRAIN.fish);
  const fish = createResourceNode(world, { tile: { tx: 22, ty: 11 }, type: 'food', amount: NAVAL.fishAmount, sea: true });
  const gathering = new GatheringSystem(world, map, players);
  const pathing = new PathfindingSystem(world, map);
  const movement = new MovementSystem(world, players, map);
  const step = (ms: number) => {
    for (let t = 0; t < ms; t += 100) {
      pathing.update();
      movement.update(100);
      gathering.update(100);
    }
  };
  return { map, world, players, dock, tc, fish, step };
}

describe('fishing (M14)', () => {
  it('a fishing boat fishes the school from the water beside it and brings the food to the dock', () => {
    const { map, world, players, fish, step } = setup();
    const boat = createUnit(world, { type: 'fishing_boat', tile: { tx: 16, ty: 11 }, playerId: 1 });
    expect(boat.gatherer?.capacity).toBe(NAVAL.fishCapacity);
    world.addComponent(boat, 'gatherIntent', { nodeId: fish.id! });
    const before = players.get(1)!.resources.food;
    step(90_000);
    expect(players.get(1)!.resources.food).toBeGreaterThan(before + NAVAL.fishCapacity);
    // The boat never left the water.
    expect(map.getTile(boat.position!.tx, boat.position!.ty)).toBe(TERRAIN.water);
  });

  it('a used-up fish school turns back into open water', () => {
    const { map, world, fish, step } = setup();
    fish.resourceNode!.amount = 3;
    const boat = createUnit(world, { type: 'fishing_boat', tile: { tx: 21, ty: 11 }, playerId: 1 });
    world.addComponent(boat, 'gatherIntent', { nodeId: fish.id! });
    step(20_000);
    expect(map.getTile(22, 11)).toBe(TERRAIN.water);
    expect(world.entities.includes(fish)).toBe(false);
  });

  it('a villager drops food at the town centre, never at the dock', () => {
    const { map, world, tc, step } = setup();
    map.setTile(9, 12, TERRAIN.berries);
    const bush = createResourceNode(world, { tile: { tx: 9, ty: 12 }, type: 'food' });
    const v = createVillager(world, { tile: { tx: 9, ty: 13 } });
    world.addComponent(v, 'gatherIntent', { nodeId: bush.id! });
    step(30_000);
    expect(v.gatherer!.dropoffId).toBe(tc.id);
  });

  it('a villager whose berries run out does not head for a fish school', () => {
    const { map, world, step } = setup();
    map.setTile(13, 14, TERRAIN.berries);
    const bush = createResourceNode(world, { tile: { tx: 13, ty: 14 }, type: 'food', amount: 2 });
    map.setTile(15, 14, TERRAIN.fish);
    const near = createResourceNode(world, { tile: { tx: 15, ty: 14 }, type: 'food', amount: NAVAL.fishAmount, sea: true });
    const v = createVillager(world, { tile: { tx: 13, ty: 15 } });
    world.addComponent(v, 'gatherIntent', { nodeId: bush.id! });
    step(20_000);
    expect(v.gatherer!.targetNodeId).not.toBe(near.id);
  });
});
