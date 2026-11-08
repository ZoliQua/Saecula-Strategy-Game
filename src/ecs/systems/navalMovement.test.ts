import { describe, expect, it } from 'vitest';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { createBuilding } from '../archetypes/building';
import { createUnit } from '../archetypes/createUnit';
import { createEcsWorld } from '../world';
import { moveLayerOf } from '../navLayer';
import { MovementSystem } from './MovementSystem';
import { PathfindingSystem } from './PathfindingSystem';
import { TrainingSystem } from './TrainingSystem';

/** A 30×30 map: land on the west (x < 15), sea on the east. */
function coast(): MapData {
  const map = new MapData(30, 30, TERRAIN.grass);
  for (let ty = 0; ty < 30; ty++) for (let tx = 15; tx < 30; tx++) map.setTile(tx, ty, TERRAIN.water);
  return map;
}

function setup() {
  const map = coast();
  const world = createEcsWorld();
  const pathing = new PathfindingSystem(world, map);
  const movement = new MovementSystem(world, null, map);
  const step = (ms: number) => {
    for (let t = 0; t < ms; t += 100) {
      pathing.update();
      movement.update(100);
    }
  };
  return { map, world, step };
}

describe('ships move on water, land units on land (M14)', () => {
  it('a ship is on the water layer, a land unit on the land layer', () => {
    const { world } = setup();
    expect(moveLayerOf(createUnit(world, { type: 'galley', tile: { tx: 20, ty: 5 }, playerId: 1 }))).toBe('water');
    expect(moveLayerOf(createUnit(world, { type: 'archer', tile: { tx: 5, ty: 5 }, playerId: 1 }))).toBe('land');
  });

  it('a ship sails over water and, sent ashore, stops at the water edge', () => {
    const { map, world, step } = setup();
    const ship = createUnit(world, { type: 'galley', tile: { tx: 25, ty: 5 }, playerId: 1 });
    world.addComponent(ship, 'moveIntent', { target: { tx: 25, ty: 25 } });
    step(30_000);
    expect(ship.position).toEqual({ tx: 25, ty: 25 });
    world.addComponent(ship, 'moveIntent', { target: { tx: 3, ty: 25 } });
    step(30_000);
    expect(ship.position).toEqual({ tx: 15, ty: 25 });
    expect(map.getTile(ship.position!.tx, ship.position!.ty)).toBe(TERRAIN.water);
  });

  it('a land unit sent out to sea stops on the shore', () => {
    const { world, step } = setup();
    const archer = createUnit(world, { type: 'archer', tile: { tx: 5, ty: 5 }, playerId: 1 });
    world.addComponent(archer, 'moveIntent', { target: { tx: 25, ty: 5 } });
    step(30_000);
    expect(archer.position).toEqual({ tx: 14, ty: 5 });
  });

  it('the dock launches its ships on the water beside it, its land units ashore', () => {
    const { map, world } = setup();
    // A dock on the shore: its east side touches the sea.
    const dock = createBuilding(world, { type: 'dock', origin: { tx: 12, ty: 10 }, playerId: 1, mapData: map });
    world.removeComponent(dock, 'underConstruction');
    dock.trainingQueue!.entries.push({ unitType: 'galley', elapsed: 0, totalTime: 1 });
    new TrainingSystem(world, map).update(2000);
    const ship = world.entities.find((e) => e.unit?.unitType === 'galley')!;
    expect(map.getTile(ship.position!.tx, ship.position!.ty)).toBe(TERRAIN.water);
  });
});
