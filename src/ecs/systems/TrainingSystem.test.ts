import { beforeEach, describe, expect, it } from 'vitest';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { uiStore } from '../../ui/store';
import { createBuilding } from '../archetypes/building';
import { queueUnit } from '../queueUnit';
import { createEcsWorld } from '../world';
import { TrainingSystem } from './TrainingSystem';

function setup() {
  const map = new MapData(16, 16, TERRAIN.grass);
  const world = createEcsWorld();
  const tc = createBuilding(world, {
    type: 'town_center',
    origin: { tx: 4, ty: 4 },
    playerId: 1,
    mapData: map,
  });
  const system = new TrainingSystem(world, map);
  return { map, world, tc, system };
}

describe('TrainingSystem', () => {
  beforeEach(() => {
    uiStore.setState({
      resources: { food: 500, wood: 200, gold: 100 },
      population: { current: 0, cap: 50 },
    });
  });

  it('queueUnit deducts food cost and pushes an entry', () => {
    const { tc } = setup();
    const beforeFood = uiStore.getState().resources.food;
    const result = queueUnit(tc, 'villager', { age: 1, civ: 'hungarian' });
    expect(result.ok).toBe(true);
    expect(uiStore.getState().resources.food).toBe(beforeFood - 50);
    expect(tc.trainingQueue?.entries.length).toBe(1);
  });

  it('queueUnit refuses when resources are insufficient', () => {
    const { tc } = setup();
    uiStore.getState().setResources({ food: 10 });
    const result = queueUnit(tc, 'villager', { age: 1, civ: 'hungarian' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('insufficient-resources');
    expect(tc.trainingQueue?.entries.length ?? 0).toBe(0);
  });

  it('completes training and spawns a villager', () => {
    const { tc, system, world } = setup();
    queueUnit(tc, 'villager', { age: 1, civ: 'hungarian' });
    const trainTime = tc.trainingQueue!.entries[0]!.totalTime;
    system.update(trainTime * 1000 + 100);
    expect(tc.trainingQueue!.entries.length).toBe(0);
    const villagers = world.entities.filter((e) => e.unit?.unitType === 'villager');
    expect(villagers.length).toBe(1);
  });

  it('respects the max queue size', () => {
    const { tc } = setup();
    for (let i = 0; i < 5; i++) queueUnit(tc, 'villager', { age: 1, civ: 'hungarian' });
    const result = queueUnit(tc, 'villager', { age: 1, civ: 'hungarian' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('queue-full');
  });

  it('rejects training while at population cap', () => {
    const { tc } = setup();
    uiStore.setState({ population: { current: 50, cap: 50 } });
    const result = queueUnit(tc, 'villager', { age: 1, civ: 'hungarian' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('pop-cap');
  });
});
