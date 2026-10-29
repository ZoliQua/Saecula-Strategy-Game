import { describe, expect, it } from 'vitest';
import { createBuilding } from '../ecs/archetypes/building';
import { createEcsWorld } from '../ecs/world';
import { MapData } from '../map/MapData';
import { scoreBreakdown, standingBuildingValue } from './score';

describe('score', () => {
  it('a hand-built world with known gathered, kills, buildings and age gives the exact total', () => {
    const world = createEcsWorld();
    const map = new MapData(32, 32);
    // Finished: town centre 375 + house 30 + barracks 175 = 580 → 58.
    createBuilding(world, { type: 'town_center', origin: { tx: 1, ty: 1 }, playerId: 1, mapData: map });
    createBuilding(world, { type: 'house', origin: { tx: 6, ty: 1 }, playerId: 1, mapData: map });
    createBuilding(world, { type: 'barracks', origin: { tx: 10, ty: 1 }, playerId: 1, mapData: map });
    // Neither a site, a collapsing building nor another player's counts.
    createBuilding(world, { type: 'house', origin: { tx: 14, ty: 1 }, playerId: 1, mapData: map, underConstruction: true });
    const dying = createBuilding(world, { type: 'farm', origin: { tx: 18, ty: 1 }, playerId: 1, mapData: map });
    world.addComponent(dying, 'dying', { ttlMs: 100 });
    createBuilding(world, { type: 'house', origin: { tx: 22, ty: 1 }, playerId: 2, mapData: map });
    expect(standingBuildingValue(world, 1)).toBe(580);

    const b = scoreBreakdown({ id: 1, age: 2 }, { gathered: 1234, killValue: 999 }, world);
    expect(b).toEqual({ economy: 123, military: 99, buildings: 58, age: 300, total: 123 + 99 + 58 + 300 });
    expect(scoreBreakdown({ id: 2, age: 3 }, { gathered: 0, killValue: 0 }, world).total).toBe(3 + 800);
    expect(scoreBreakdown({ id: 3, age: 1 }, { gathered: 9, killValue: 9 }, world).total).toBe(0);
  });
});
