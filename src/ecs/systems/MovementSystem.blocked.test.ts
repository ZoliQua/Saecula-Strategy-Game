import { describe, expect, it } from 'vitest';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { createVillager } from '../archetypes/villager';
import { createMiniSim } from '../testing/miniSim';
import { createEcsWorld } from '../world';
import { MovementSystem } from './MovementSystem';

describe('MovementSystem with a map: tiles blocked after the path was planned', () => {
  it('stops before a newly blocked tile and re-plans to the path\'s last tile', () => {
    const world = createEcsWorld();
    const map = new MapData(16, 16, TERRAIN.grass);
    const v = createVillager(world, { tile: { tx: 0, ty: 0 } });
    v.movable!.path = [{ tx: 1, ty: 0 }, { tx: 2, ty: 0 }, { tx: 3, ty: 0 }];
    map.setBlocked(2, 0, true);
    const system = new MovementSystem(world, null, map);
    system.update(2000);
    expect(v.position).toEqual({ tx: 1, ty: 0 });
    expect(v.movable!.path).toEqual([]);
    expect(v.moveIntent).toEqual({ target: { tx: 3, ty: 0 } });
  });

  it('stops short of a last tile that became blocked (systems re-plan from an empty path)', () => {
    const world = createEcsWorld();
    const map = new MapData(16, 16, TERRAIN.grass);
    const v = createVillager(world, { tile: { tx: 0, ty: 0 } });
    v.movable!.path = [{ tx: 1, ty: 0 }, { tx: 2, ty: 0 }];
    map.setBlocked(2, 0, true);
    new MovementSystem(world, null, map).update(2000);
    expect(v.position).toEqual({ tx: 1, ty: 0 });
    expect(v.movable!.path).toEqual([]);
  });

  it('a unit escaping blocked ground may cross blocked tiles', () => {
    const world = createEcsWorld();
    const map = new MapData(16, 16, TERRAIN.grass);
    for (let y = 4; y < 7; y++) for (let x = 4; x < 7; x++) map.setBlocked(x, y, true);
    const v = createVillager(world, { tile: { tx: 5, ty: 5 } });
    v.movable!.path = [{ tx: 6, ty: 5 }, { tx: 7, ty: 5 }];
    new MovementSystem(world, null, map).update(5000);
    expect(v.position).toEqual({ tx: 7, ty: 5 });
  });

  it('a group walking through a spot where a wall of foundations appears ends up at the goal, none inside', () => {
    const sim = createMiniSim(32);
    const group = [0, 1, 2, 3].map((i) => createVillager(sim.world, { tile: { tx: 2, ty: 10 + i } }));
    for (const v of group) sim.world.addComponent(v, 'moveIntent', { target: { tx: 25, ty: 11 } });
    sim.run(1500);
    // A line of blocks across their route, with a gap at the top.
    for (let y = 3; y < 32; y++) sim.map.setBlocked(12, y, true);
    let enteredBlocked = 0;
    sim.run(30_000, 50, () => {
      for (const v of group) if (!sim.map.isPassable(v.position!.tx, v.position!.ty)) enteredBlocked++;
    });
    expect(enteredBlocked).toBe(0);
    for (const v of group) {
      expect(sim.map.isPassable(v.position!.tx, v.position!.ty)).toBe(true);
      expect(Math.max(Math.abs(v.position!.tx - 25), Math.abs(v.position!.ty - 11))).toBe(0);
    }
  });
});
