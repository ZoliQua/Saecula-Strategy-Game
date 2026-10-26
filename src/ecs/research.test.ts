import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gameEvents } from '../game/events';
import { createPlayer } from '../game/Player';
import { PlayerManager } from '../game/PlayerManager';
import { MapData } from '../map/MapData';
import { TERRAIN } from '../map/TerrainTypes';
import { uiStore } from '../ui/store';
import { createBuilding } from './archetypes/building';
import { queueUnit } from './queueUnit';
import { cancelResearch, playerWallet, startResearch } from './research';
import { ResearchSystem } from './systems/ResearchSystem';
import { createEcsWorld } from './world';

function setup(resources = { food: 2000, wood: 500, gold: 1000 }) {
  const map = new MapData(16, 16, TERRAIN.grass);
  const world = createEcsWorld();
  const tc = createBuilding(world, {
    type: 'town_center',
    origin: { tx: 4, ty: 4 },
    playerId: 2,
    mapData: map,
  });
  const player = createPlayer({ id: 2, resources });
  const players = new PlayerManager([player]);
  return { world, tc, player, wallet: playerWallet(player), system: new ResearchSystem(world, players) };
}

describe('research', () => {
  const ages: number[] = [];
  let off = () => {};
  beforeEach(() => {
    ages.length = 0;
    off = gameEvents.on('ageChanged', (e) => ages.push(e.age));
    uiStore.setState({
      resources: { food: 500, wood: 200, gold: 100 },
      population: { current: 0, cap: 50 },
    });
  });
  afterEach(() => off());

  it('pays the cost when queued', () => {
    const { world, tc, player, wallet } = setup();
    expect(startResearch(world, tc, 'feudalism', player, wallet)).toEqual({ ok: true });
    expect(player.resources).toEqual({ food: 1500, wood: 500, gold: 700 });
    expect(tc.research).toMatchObject({ techId: 'feudalism', elapsed: 0, totalTime: 120 });
  });

  it('refuses without enough resources and does not charge', () => {
    const { world, tc, player, wallet } = setup({ food: 499, wood: 0, gold: 300 });
    expect(startResearch(world, tc, 'feudalism', player, wallet).reason).toBe('insufficient-resources');
    expect(player.resources.food).toBe(499);
    expect(tc.research).toBeUndefined();
  });

  it('refuses a second research and an age-locked one', () => {
    const { world, tc, player, wallet } = setup();
    expect(startResearch(world, tc, 'enlightenment', player, wallet).reason).toBe('unavailable');
    startResearch(world, tc, 'feudalism', player, wallet);
    expect(startResearch(world, tc, 'feudalism', player, wallet).reason).toBe('already-researching');
  });

  it('cancel refunds the full cost', () => {
    const { world, tc, player, wallet } = setup();
    const before = { ...player.resources };
    startResearch(world, tc, 'feudalism', player, wallet);
    expect(cancelResearch(tc, wallet)).toBe('feudalism');
    expect(player.resources).toEqual(before);
    expect(cancelResearch({}, wallet)).toBeNull();
  });

  it('TC busy rule: training blocks research and research blocks training', () => {
    const { world, tc, player, wallet } = setup();
    expect(queueUnit(tc, 'villager').ok).toBe(true);
    expect(startResearch(world, tc, 'feudalism', player, wallet).reason).toBe('training-busy');
    tc.trainingQueue?.entries.splice(0);
    startResearch(world, tc, 'feudalism', player, wallet);
    expect(queueUnit(tc, 'villager').reason).toBe('researching');
    expect(tc.trainingQueue?.entries.length).toBe(0);
  });

  it('queueUnit refuses units above the player age', () => {
    const { tc } = setup();
    expect(queueUnit(tc, 'knight', 1).reason).toBe('age-locked');
  });

  it('completes after its duration, raises the age once and emits ageChanged', () => {
    const { world, tc, player, wallet, system } = setup();
    startResearch(world, tc, 'feudalism', player, wallet);
    system.update(119_000);
    expect(player.age).toBe(1);
    expect(tc.research?.elapsed).toBeCloseTo(119);
    system.update(1_100);
    expect(player.age).toBe(2);
    expect(player.researched.has('feudalism')).toBe(true);
    expect(tc.research).toBeUndefined();
    expect(ages).toEqual([2]);
    system.update(5_000);
    expect(ages).toEqual([2]);
  });

  it('chains both age-ups', () => {
    const { world, tc, player, wallet, system } = setup();
    startResearch(world, tc, 'feudalism', player, wallet);
    system.update(121_000);
    expect(startResearch(world, tc, 'feudalism', player, wallet).reason).toBe('unavailable');
    expect(startResearch(world, tc, 'enlightenment', player, wallet).ok).toBe(true);
    system.update(181_000);
    expect(player.age).toBe(3);
    expect(ages).toEqual([2, 3]);
  });

  it('does not advance while the building is still under construction', () => {
    const { world, tc, system } = setup();
    world.addComponent(tc, 'research', { techId: 'feudalism', elapsed: 0, totalTime: 120 });
    tc.underConstruction = { totalTime: 10, elapsed: 0 };
    system.update(200_000);
    expect(tc.research?.elapsed).toBe(0);
  });

  it('refuses the same tech at a second building of the same player', () => {
    const { world, tc, player, wallet } = setup();
    const tc2 = createBuilding(world, {
      type: 'town_center',
      origin: { tx: 9, ty: 9 },
      playerId: 2,
      mapData: new MapData(16, 16, TERRAIN.grass),
    });
    expect(startResearch(world, tc, 'feudalism', player, wallet).ok).toBe(true);
    const before = { ...player.resources };
    expect(startResearch(world, tc2, 'feudalism', player, wallet).reason).toBe('already-in-progress');
    expect(player.resources).toEqual(before);
  });

  it('completion is idempotent: a duplicate research does not re-fire ageChanged', () => {
    const { world, tc, player, system } = setup();
    const tc2 = createBuilding(world, {
      type: 'town_center',
      origin: { tx: 9, ty: 9 },
      playerId: 2,
      mapData: new MapData(16, 16, TERRAIN.grass),
    });
    world.addComponent(tc, 'research', { techId: 'feudalism', elapsed: 0, totalTime: 10 });
    world.addComponent(tc2, 'research', { techId: 'feudalism', elapsed: 0, totalTime: 10 });
    system.update(11_000);
    expect(ages).toEqual([2]);
    expect(player.age).toBe(2);
  });
});
