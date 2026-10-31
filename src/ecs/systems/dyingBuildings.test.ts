import { beforeEach, describe, expect, it } from 'vitest';
import { createPlayer } from '../../game/Player';
import { PlayerManager } from '../../game/PlayerManager';
import { killEntity } from '../../game/kill';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { uiStore } from '../../ui/store';
import { createBuilding } from '../archetypes/building';
import { createVillager } from '../archetypes/villager';
import type { Entity } from '../components';
import { queueUnit } from '../queueUnit';
import { playerWallet, startResearch } from '../research';
import { createEcsWorld } from '../world';
import { ConstructionSystem } from './ConstructionSystem';
import { ResearchSystem } from './ResearchSystem';
import { TrainingSystem } from './TrainingSystem';

type Alive = Entity & { health: { current: number; max: number } };

/** A destroyed building collapses for BUILDING_DEATH_TTL_MS; nothing may finish inside it meanwhile. */
describe('dying (collapsing) buildings', () => {
  beforeEach(() => {
    uiStore.setState({ resources: { food: 500, wood: 500, gold: 500 }, population: { current: 0, cap: 50 } });
  });

  it('a dying barracks does not complete training', () => {
    const map = new MapData(16, 16, TERRAIN.grass);
    const world = createEcsWorld();
    const tc = createBuilding(world, { type: 'town_center', origin: { tx: 4, ty: 4 }, playerId: 1, mapData: map });
    queueUnit(tc, 'villager', { age: 1, civ: 'hungarian' });
    const trainTime = tc.trainingQueue!.entries[0]!.totalTime;
    killEntity(world, tc as Alive);
    new TrainingSystem(world, map).update(trainTime * 1000 + 100);
    expect(world.entities.filter((e) => e.unit?.unitType === 'villager')).toHaveLength(0);
  });

  it('a dying site cannot complete, and its builders are released', () => {
    const map = new MapData(10, 10, TERRAIN.grass);
    const world = createEcsWorld();
    const site = createBuilding(world, { type: 'house', origin: { tx: 3, ty: 3 }, playerId: 1, mapData: map, underConstruction: true });
    const v = createVillager(world, { tile: { tx: 2, ty: 3 } });
    world.addComponent(v, 'buildCommand', { targetId: site.id! });
    killEntity(world, site as Alive);
    new ConstructionSystem(world, map).update(site.underConstruction!.totalTime * 1000 + 100);
    expect(site.underConstruction).toBeDefined();
    expect(site.health!.current).toBe(0);
    expect(v.buildCommand).toBeUndefined();
  });

  it('research in a dying building is lost, not completed', () => {
    const map = new MapData(24, 24, TERRAIN.grass);
    const world = createEcsWorld();
    const a = createPlayer({ id: 1, resources: { food: 5000, wood: 5000, gold: 5000 } });
    a.age = 2;
    const players = new PlayerManager([a]);
    const smith = createBuilding(world, { type: 'blacksmith', origin: { tx: 0, ty: 0 }, playerId: 1, mapData: map });
    expect(startResearch(world, smith, 'armor_1', a, playerWallet(a)).ok).toBe(true);
    killEntity(world, smith as Alive);
    new ResearchSystem(world, players).update(100_000);
    expect(a.researched.has('armor_1')).toBe(false);
  });
});
