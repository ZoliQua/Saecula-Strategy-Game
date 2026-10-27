import { describe, expect, it } from 'vitest';
import { MapData } from '../../map/MapData';
import { PathBudget } from '../../map/pathBudget';
import { TERRAIN } from '../../map/TerrainTypes';
import { createVillager } from '../archetypes/villager';
import { createEcsWorld } from '../world';
import { PathfindingSystem } from './PathfindingSystem';

describe('PathfindingSystem', () => {
  it('plans at most the per-frame budget; the other move orders wait for later ticks', () => {
    const map = new MapData(32, 32, TERRAIN.grass);
    const world = createEcsWorld();
    const units = Array.from({ length: 12 }, (_, i) => {
      const v = createVillager(world, { tile: { tx: i, ty: 0 } });
      world.addComponent(v, 'moveIntent', { target: { tx: i, ty: 20 } });
      return v;
    });
    const budget = new PathBudget(5);
    const system = new PathfindingSystem(world, map, budget);
    const planned = () => units.filter((u) => u.movable!.path.length > 0).length;
    budget.reset(1000 / 60);
    system.update();
    expect(planned()).toBe(5);
    expect(units.filter((u) => u.moveIntent).length).toBe(7);
    budget.reset(1000 / 60);
    system.update();
    budget.reset(1000 / 60);
    system.update();
    expect(planned()).toBe(12);
    expect(units.some((u) => u.moveIntent)).toBe(false);
  });
});
