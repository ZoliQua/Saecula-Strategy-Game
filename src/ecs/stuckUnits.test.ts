import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { TERRAIN } from '../map/TerrainTypes';
import { BuildPlacement } from '../scenes/game/BuildPlacement';
import { resetUiStore, uiStore } from '../ui/store';
import { createBuilding } from './archetypes/building';
import { createVillager } from './archetypes/villager';
import type { Entity } from './components';
import type { SelectionSystem } from './systems/SelectionSystem';
import { createMiniSim, type MiniSim } from './testing/miniSim';

/** The human's placement tool over a mini sim, with `selected` as the selection. */
function placement(sim: MiniSim, selected: Entity[] = []): BuildPlacement {
  resetUiStore();
  uiStore.getState().setResources({ food: 5000, wood: 5000, gold: 5000 });
  const selection = { getSelected: () => selected[0], getAllSelected: () => selected } as unknown as SelectionSystem;
  return new BuildPlacement({} as Phaser.Scene, sim.world, sim.map, selection, () => null, () => 1, 1, 'hungarian');
}

const onFreeGround = (sim: MiniSim, v: Entity) => sim.map.isPassable(v.position!.tx, v.position!.ty);

describe('stuck units (M7 playtest repros)', () => {
  it('(a) a villager whose move ended on a tile that a foundation then covers walks off it', () => {
    const sim = createMiniSim(32);
    const v = createVillager(sim.world, { tile: { tx: 4, ty: 10 } });
    sim.world.addComponent(v, 'moveIntent', { target: { tx: 9, ty: 10 } });
    sim.run(5000);
    expect(v.position).toEqual({ tx: 9, ty: 10 });
    placement(sim).tryPlaceBuilding({ tx: 8, ty: 9 }, 'barracks');
    sim.run(2000);
    expect(onFreeGround(sim, v)).toBe(true);
  });

  it('(b) a villager standing where a foundation was placed obeys a build order for another site', () => {
    const sim = createMiniSim(32);
    const v = createVillager(sim.world, { tile: { tx: 9, ty: 10 } });
    placement(sim).tryPlaceBuilding({ tx: 8, ty: 9 }, 'barracks');
    const other = createBuilding(sim.world, { type: 'house', origin: { tx: 20, ty: 20 }, playerId: 1, mapData: sim.map, underConstruction: true });
    sim.world.addComponent(v, 'buildCommand', { targetId: other.id! });
    sim.run(15_000);
    expect(onFreeGround(sim, v)).toBe(true);
    expect(other.underConstruction?.elapsed ?? Infinity).toBeGreaterThan(0);
  });

  it('a villager ordered to build the foundation it stands on steps out and builds it', () => {
    const sim = createMiniSim(32);
    const v = createVillager(sim.world, { tile: { tx: 9, ty: 10 } });
    placement(sim, [v]).tryPlaceBuilding({ tx: 8, ty: 9 }, 'barracks');
    const site = sim.world.entities.find((e) => e.building?.type === 'barracks')!;
    expect(v.buildCommand?.targetId).toBe(site.id);
    sim.run(3000);
    expect(onFreeGround(sim, v)).toBe(true);
    expect(site.underConstruction!.elapsed).toBeGreaterThan(0);
  });

  it('(c) a unit in a pocket whose only exits are diagonal corner cuts can leave', () => {
    const sim = createMiniSim(32);
    // Two houses touching the villager's tile on opposite sides, plus blocks on the other two.
    for (const [x, y] of [[9, 10], [11, 10], [10, 9], [10, 11]] as const) sim.map.setBlocked(x, y, true);
    const v = createVillager(sim.world, { tile: { tx: 10, ty: 10 } });
    sim.world.addComponent(v, 'moveIntent', { target: { tx: 20, ty: 20 } });
    sim.run(15_000);
    expect(v.position).toEqual({ tx: 20, ty: 20 });
  });

  it('(c) side by side at a forest edge: a tree whose nearest free neighbour is a cut-off hole is still worked from a reachable tile', () => {
    const sim = createMiniSim(32);
    createBuilding(sim.world, { type: 'town_center', origin: { tx: 11, ty: 20 }, playerId: 1, mapData: sim.map });
    // A forest band (rows 11-12) with a grass hole at (12,11) that only touches the target tree
    // (12,10) and the hole's neighbours through blocked corners.
    for (let x = 4; x < 20; x++) for (const y of [11, 12]) if (!(x === 12 && y === 11)) sim.resource({ tx: x, ty: y }, TERRAIN.forest);
    sim.resource({ tx: 12, ty: 10 }, TERRAIN.forest);
    const tree = sim.world.entities.find((e) => e.resourceNode && e.position?.tx === 12 && e.position.ty === 10)!;
    const a = createVillager(sim.world, { tile: { tx: 12, ty: 14 } });
    const b = createVillager(sim.world, { tile: { tx: 13, ty: 14 } });
    for (const v of [a, b]) sim.world.addComponent(v, 'gatherIntent', { nodeId: tree.id! });
    sim.run(30_000);
    expect(tree.resourceNode!.amount).toBeLessThan(tree.resourceNode!.maxAmount);
    for (const v of [a, b]) expect(v.position).not.toEqual({ tx: 12 + (v === b ? 1 : 0), ty: 14 });
  });
});

describe('stuck units: workers and fighters on a fresh foundation', () => {
  it('a villager chopping a tree when a house is laid over its tile steps out and keeps chopping', () => {
    const sim = createMiniSim(32);
    createBuilding(sim.world, { type: 'town_center', origin: { tx: 2, ty: 2 }, playerId: 1, mapData: sim.map });
    for (let y = 8; y < 16; y++) sim.resource({ tx: 14, ty: y }, TERRAIN.forest);
    const tree = sim.world.entities.find((e) => e.resourceNode && e.position?.tx === 14 && e.position.ty === 10)!;
    const v = createVillager(sim.world, { tile: { tx: 13, ty: 10 } });
    sim.world.addComponent(v, 'gatherIntent', { nodeId: tree.id! });
    sim.run(500);
    placement(sim).tryPlaceBuilding({ tx: 12, ty: 10 }, 'house');
    sim.run(3000);
    expect(onFreeGround(sim, v)).toBe(true);
    const carried = v.gatherer!.carrying;
    sim.run(2000);
    expect(v.gatherer!.carrying + tree.resourceNode!.maxAmount - tree.resourceNode!.amount).toBeGreaterThan(carried);
  });
});
