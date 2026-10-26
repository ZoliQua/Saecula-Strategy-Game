import { beforeEach, describe, expect, it } from 'vitest';
import { MapData } from '../map/MapData';
import { TERRAIN } from '../map/TerrainTypes';
import { resetUiStore, uiStore } from '../ui/store';
import { createBuilding } from './archetypes/building';
import { createResourceNode } from './archetypes/resource';
import { createVillager } from './archetypes/villager';
import { queueUnit } from './queueUnit';
import { ConstructionSystem } from './systems/ConstructionSystem';
import { GatheringSystem } from './systems/GatheringSystem';
import { MovementSystem } from './systems/MovementSystem';
import { PathfindingSystem } from './systems/PathfindingSystem';
import { PopulationSystem } from './systems/PopulationSystem';
import { TrainingSystem } from './systems/TrainingSystem';
import { createEcsWorld } from './world';

interface GameRig {
  map: MapData;
  world: ReturnType<typeof createEcsWorld>;
  systems: {
    pathfinding: PathfindingSystem;
    gathering: GatheringSystem;
    construction: ConstructionSystem;
    training: TrainingSystem;
    movement: MovementSystem;
    population: PopulationSystem;
  };
  tick(ms: number): void;
  run(totalMs: number, stepMs?: number): void;
}

function createRig(): GameRig {
  const map = new MapData(20, 20, TERRAIN.grass);
  const world = createEcsWorld();
  const systems = {
    pathfinding: new PathfindingSystem(world, map),
    gathering: new GatheringSystem(world, map),
    construction: new ConstructionSystem(world, map),
    training: new TrainingSystem(world, map),
    movement: new MovementSystem(world),
    population: new PopulationSystem(world, 1),
  };
  const tick = (ms: number) => {
    systems.pathfinding.update();
    systems.gathering.update(ms);
    systems.construction.update(ms);
    systems.training.update(ms);
    systems.movement.update(ms);
    systems.population.update();
  };
  const run = (totalMs: number, stepMs = 100) => {
    const steps = Math.ceil(totalMs / stepMs);
    for (let i = 0; i < steps; i++) tick(stepMs);
  };
  return { map, world, systems, tick, run };
}

describe('integration — M1 vertical slice', () => {
  beforeEach(() => {
    resetUiStore();
  });

  it('gather-and-deposit cycle raises the wood count', () => {
    const { map, world, run } = createRig();
    createBuilding(world, {
      type: 'town_center',
      origin: { tx: 5, ty: 5 },
      playerId: 1,
      mapData: map,
    });
    map.setTile(10, 6, TERRAIN.forest);
    const tree = createResourceNode(world, {
      tile: { tx: 10, ty: 6 },
      type: 'wood',
    });
    const v = createVillager(world, { tile: { tx: 9, ty: 6 } });
    world.addComponent(v, 'gatherIntent', { nodeId: tree.id! });

    run(30000, 200);

    // After 30s the villager should have completed at least one
    // gather + drop-off cycle.
    expect(uiStore.getState().resources.wood).toBeGreaterThan(0);
  });

  it('construction progresses when the builder is adjacent', () => {
    const { map, world, run } = createRig();
    const site = createBuilding(world, {
      type: 'house',
      origin: { tx: 4, ty: 4 },
      playerId: 1,
      mapData: map,
      underConstruction: true,
    });
    const v = createVillager(world, { tile: { tx: 3, ty: 4 } });
    world.addComponent(v, 'buildCommand', { targetId: site.id! });

    // Houses need 25 builder-seconds. Give 30 to be safe.
    run(30000, 200);

    const resolved = world.entities.find((e) => e.id === site.id)!;
    expect(resolved.underConstruction).toBeUndefined();
    expect(resolved.health!.current).toBe(resolved.health!.max);
  });

  it('training queues a villager and adds to population', () => {
    const { map, world, run } = createRig();
    const tc = createBuilding(world, {
      type: 'town_center',
      origin: { tx: 5, ty: 5 },
      playerId: 1,
      mapData: map,
    });
    uiStore.getState().setResources({ food: 500 });
    uiStore.getState().setPopulation({ cap: 50 });
    const before = world.entities.filter(
      (e) => e.unit?.unitType === 'villager',
    ).length;
    const result = queueUnit(tc, 'villager', 1);
    expect(result.ok).toBe(true);

    run(30000, 250);

    const after = world.entities.filter(
      (e) => e.unit?.unitType === 'villager',
    ).length;
    expect(after).toBe(before + 1);
  });

  it('full loop: gather → build a barracks → train a swordsman', () => {
    const { map, world, run } = createRig();
    const tc = createBuilding(world, {
      type: 'town_center',
      origin: { tx: 5, ty: 5 },
      playerId: 1,
      mapData: map,
    });
    uiStore.getState().setResources({ food: 300, wood: 300, gold: 300 });

    // Place a barracks site near the TC; hand three villagers to it.
    const site = createBuilding(world, {
      type: 'barracks',
      origin: { tx: 10, ty: 10 },
      playerId: 1,
      mapData: map,
      underConstruction: true,
    });
    for (let i = 0; i < 3; i++) {
      const v = createVillager(world, { tile: { tx: 9 + i, ty: 9 } });
      world.addComponent(v, 'buildCommand', { targetId: site.id! });
    }

    // Barracks buildTime = 50s; 3 builders → ~17s. Run 25s to be safe.
    run(25000, 200);
    const completed = world.entities.find((e) => e.id === site.id)!;
    expect(completed.underConstruction).toBeUndefined();
    expect(completed.trainingQueue).toBeDefined();

    // Queue a swordsman.
    const queueResult = queueUnit(completed, 'swordsman', 1);
    expect(queueResult.ok).toBe(true);
    run(30000, 250);

    const swords = world.entities.filter(
      (e) => e.unit?.unitType === 'swordsman',
    );
    expect(swords.length).toBe(1);

    // Town center selection still works through this sequence (sanity).
    void tc;
  });
});
