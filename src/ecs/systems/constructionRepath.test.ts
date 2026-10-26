import { describe, expect, it, vi } from 'vitest';
import { MapData } from '../../map/MapData';
import * as pathfinding from '../../map/pathfinding';
import { TERRAIN } from '../../map/TerrainTypes';
import { createBuilding } from '../archetypes/building';
import { createVillager } from '../archetypes/villager';
import { createWall } from '../archetypes/wall';
import { createEcsWorld } from '../world';
import { ConstructionSystem } from './ConstructionSystem';

vi.mock('../../map/pathfinding', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../map/pathfinding')>();
  return { ...actual, findPath: vi.fn(actual.findPath) };
});

describe('ConstructionSystem repath throttle', () => {
  it('does not re-run A* every tick for a site walled off from its builder', () => {
    const map = new MapData(16, 16, TERRAIN.grass);
    const world = createEcsWorld();
    const site = createBuilding(world, { type: 'house', origin: { tx: 8, ty: 8 }, playerId: 1, mapData: map, underConstruction: true });
    // A free ring around the site, enclosed by enemy walls: adjacent tiles exist but are unreachable.
    for (let x = 6; x <= 11; x++) {
      for (let y = 6; y <= 11; y++) {
        if (x === 6 || x === 11 || y === 6 || y === 11) createWall(world, { tile: { tx: x, ty: y }, playerId: 2, mapData: map });
      }
    }
    const v = createVillager(world, { tile: { tx: 2, ty: 2 }, playerId: 1 });
    world.addComponent(v, 'buildCommand', { targetId: site.id! });
    const system = new ConstructionSystem(world, map);
    const findPath = vi.mocked(pathfinding.findPath);
    findPath.mockClear();
    for (let i = 0; i < 60; i++) system.update(16); // ~1 s of frames
    expect(findPath.mock.calls.length).toBeLessThanOrEqual(1);
    for (let i = 0; i < 120; i++) system.update(16); // ~2 s more
    expect(findPath.mock.calls.length).toBeLessThanOrEqual(3);
  });
});
