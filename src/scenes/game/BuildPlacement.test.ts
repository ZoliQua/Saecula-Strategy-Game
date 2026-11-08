import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { createBuilding } from '../../ecs/archetypes/building';
import { createUnit } from '../../ecs/archetypes/createUnit';
import { createVillager } from '../../ecs/archetypes/villager';
import type { SelectionSystem } from '../../ecs/systems/SelectionSystem';
import { createEcsWorld } from '../../ecs/world';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { resetUiStore, uiStore } from '../../ui/store';
import { BuildPlacement } from './BuildPlacement';

function setup() {
  resetUiStore();
  uiStore.getState().setResources({ food: 5000, wood: 5000, gold: 5000 });
  const map = new MapData(40, 40);
  const world = createEcsWorld();
  const selection = { getSelected: () => null, getAllSelected: () => [] } as unknown as SelectionSystem;
  const placement = new BuildPlacement({} as Phaser.Scene, world, map, selection, () => null, () => 3, 1, 'hungarian');
  const wonders = () => world.entities.filter((e) => e.building?.type === 'wonder' && e.owner?.playerId === 1);
  return { map, world, placement, wonders };
}

describe('BuildPlacement', () => {
  it('places one Wonder per player and refuses a second (even while the first is a site)', () => {
    const { placement, wonders } = setup();
    expect(placement.canBuildType('wonder')).toBe(true);
    placement.tryPlaceBuilding({ tx: 4, ty: 4 }, 'wonder');
    expect(wonders()).toHaveLength(1);
    expect(placement.canBuildType('wonder')).toBe(false);
    placement.tryPlaceBuilding({ tx: 20, ty: 20 }, 'wonder');
    expect(wonders()).toHaveLength(1);
  });

  it("another player's Wonder does not block the human's", () => {
    const { map, world, placement, wonders } = setup();
    createBuilding(world, { type: 'wonder', origin: { tx: 30, ty: 30 }, playerId: 2, mapData: map });
    placement.tryPlaceBuilding({ tx: 4, ty: 4 }, 'wonder');
    expect(wonders()).toHaveLength(1);
  });
});

describe('BuildPlacement docks (M14)', () => {
  it('places a dock only on the shore (a side along open water)', () => {
    const { map, world, placement } = setup();
    for (let ty = 0; ty < 40; ty++) for (let tx = 25; tx < 40; tx++) map.setTile(tx, ty, TERRAIN.water);
    const docks = () => world.entities.filter((e) => e.building?.type === 'dock');
    expect(placement.canPlaceBuilding({ tx: 10, ty: 10 }, 3, 3, 'dock')).toBe(false);
    placement.tryPlaceBuilding({ tx: 10, ty: 10 }, 'dock');
    expect(docks()).toHaveLength(0);
    expect(placement.canPlaceBuilding({ tx: 22, ty: 10 }, 3, 3, 'dock')).toBe(true);
    placement.tryPlaceBuilding({ tx: 22, ty: 10 }, 'dock');
    expect(docks()).toHaveLength(1);
    // Other buildings need no water.
    expect(placement.canPlaceBuilding({ tx: 10, ty: 10 }, 3, 3, 'barracks')).toBe(true);
  });
});

describe('BuildPlacement builders (M7)', () => {
  it('gives the new site to every selected own villager, not to soldiers or enemies', () => {
    resetUiStore();
    uiStore.getState().setResources({ food: 5000, wood: 5000, gold: 5000 });
    const map = new MapData(40, 40);
    const world = createEcsWorld();
    const a = createVillager(world, { tile: { tx: 2, ty: 2 } });
    const b = createVillager(world, { tile: { tx: 3, ty: 2 } });
    const foe = createVillager(world, { tile: { tx: 4, ty: 2 }, playerId: 2 });
    const sword = createUnit(world, { type: 'swordsman', tile: { tx: 5, ty: 2 }, playerId: 1 });
    world.addComponent(a, 'gatherIntent', { nodeId: 99 });
    const selected = [a, b, foe, sword];
    const selection = { getSelected: () => selected[0], getAllSelected: () => selected } as unknown as SelectionSystem;
    const placement = new BuildPlacement({} as Phaser.Scene, world, map, selection, () => null, () => 1, 1, 'hungarian');
    placement.tryPlaceBuilding({ tx: 10, ty: 10 }, 'house');
    const site = world.entities.find((e) => e.building?.type === 'house')!;
    expect(a.buildCommand).toEqual({ targetId: site.id });
    expect(a.gatherIntent).toBeUndefined();
    expect(b.buildCommand).toEqual({ targetId: site.id });
    expect(foe.buildCommand).toBeUndefined();
    expect(sword.buildCommand).toBeUndefined();
  });
});
