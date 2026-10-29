import { describe, expect, it } from 'vitest';
import { createBuilding } from '../../ecs/archetypes/building';
import { createEcsWorld } from '../../ecs/world';
import { MapData } from '../../map/MapData';
import { homeTargets, nextHome } from './homeTargets';

describe('Haza (home) targets', () => {
  it('steps through the living, finished own town centres in id order and wraps', () => {
    const world = createEcsWorld();
    const map = new MapData(40, 40);
    const a = createBuilding(world, { type: 'town_center', origin: { tx: 2, ty: 2 }, playerId: 1, mapData: map });
    const b = createBuilding(world, { type: 'town_center', origin: { tx: 20, ty: 10 }, playerId: 1, mapData: map });
    createBuilding(world, { type: 'town_center', origin: { tx: 30, ty: 30 }, playerId: 1, mapData: map, underConstruction: true });
    createBuilding(world, { type: 'town_center', origin: { tx: 10, ty: 30 }, playerId: 2, mapData: map });
    const dead = createBuilding(world, { type: 'town_center', origin: { tx: 25, ty: 2 }, playerId: 1, mapData: map });
    world.addComponent(dead, 'dying', { ttlMs: 100 });

    expect(homeTargets(world, 1)).toEqual([
      { id: a.id, tile: { tx: 3, ty: 3 } },
      { id: b.id, tile: { tx: 21, ty: 11 } },
    ]);
    expect(nextHome(world, 1, null)?.id).toBe(a.id);
    expect(nextHome(world, 1, a.id!)?.id).toBe(b.id);
    expect(nextHome(world, 1, b.id!)?.id).toBe(a.id);
    expect(nextHome(world, 3, null)).toBeNull();
  });
});
