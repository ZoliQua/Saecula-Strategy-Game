import { beforeEach, describe, expect, it } from 'vitest';
import { createPlayer } from '../game/Player';
import { MapData } from '../map/MapData';
import { TERRAIN } from '../map/TerrainTypes';
import { uiStore } from '../ui/store';
import { createBuilding } from './archetypes/building';
import { UNIT_SPECS } from './archetypes/unit';
import { cancelQueuedUnit, queueUnit, type TrainAccount } from './queueUnit';
import { playerWallet } from './research';
import { createEcsWorld } from './world';

function setup() {
  const map = new MapData(20, 20, TERRAIN.grass);
  const world = createEcsWorld();
  const make = (type: 'town_center' | 'barracks' | 'stable' | 'house', tx: number) =>
    createBuilding(world, { type, origin: { tx, ty: 2 }, playerId: 2, mapData: map });
  return { world, tc: make('town_center', 1), barracks: make('barracks', 5), stable: make('stable', 9), house: make('house', 13) };
}

describe('queueUnit', () => {
  beforeEach(() => {
    uiStore.setState({ resources: { food: 500, wood: 500, gold: 500 }, population: { current: 0, cap: 50 } });
  });

  it('only accepts one of the unit type trainers', () => {
    const { tc, barracks, stable } = setup();
    expect(queueUnit(tc, 'swordsman', 3).reason).toBe('wrong-trainer');
    expect(queueUnit(barracks, 'villager', 3).reason).toBe('wrong-trainer');
    expect(queueUnit(barracks, 'knight', 3).reason).toBe('wrong-trainer');
    expect(queueUnit(stable, 'knight', 3).ok).toBe(true);
    expect(queueUnit(barracks, 'swordsman', 1).ok).toBe(true);
  });

  it('refuses buildings without a queue and collapsing trainers', () => {
    const { world, house, barracks } = setup();
    expect(queueUnit(house, 'villager', 1).reason).toBe('missing-queue');
    world.addComponent(barracks, 'dying', { ttlMs: 100 });
    expect(queueUnit(barracks, 'swordsman', 1).reason).toBe('missing-queue');
  });

  it('refuses units above the player age', () => {
    const { stable } = setup();
    expect(queueUnit(stable, 'knight', 1).reason).toBe('age-locked');
  });

  it('charges the given account and checks its population, not the UI store', () => {
    const { barracks } = setup();
    const player = createPlayer({ id: 2, resources: { food: 60, wood: 0, gold: 20 } });
    let pop = { current: 4, cap: 5 };
    const account: TrainAccount = { wallet: playerWallet(player), population: () => pop };
    expect(queueUnit(barracks, 'swordsman', 1, account).ok).toBe(true);
    expect(player.resources).toEqual({ food: 0, wood: 0, gold: 0 });
    expect(uiStore.getState().resources.food).toBe(500);
    pop = { current: 5, cap: 5 };
    player.resources = { food: 500, wood: 500, gold: 500 };
    expect(queueUnit(barracks, 'swordsman', 1, account).reason).toBe('pop-cap');
  });
});

describe('cancelQueuedUnit', () => {
  it('removes the entry and refunds its full cost into the wallet', () => {
    const trainer = { trainingQueue: { entries: [{ unitType: 'villager' as const, elapsed: 4, totalTime: 10 }], maxQueue: 5 } };
    let value = { food: 0, wood: 0, gold: 0 };
    const wallet = { get: () => value, set: (n: typeof value) => void (value = { ...n }) };
    expect(cancelQueuedUnit(trainer, 0, wallet)).toBe(true);
    expect(trainer.trainingQueue.entries).toHaveLength(0);
    expect(value).toEqual(UNIT_SPECS.villager.cost);
    expect(cancelQueuedUnit(trainer, 0, wallet)).toBe(false);
    expect(value).toEqual(UNIT_SPECS.villager.cost);
  });
});
