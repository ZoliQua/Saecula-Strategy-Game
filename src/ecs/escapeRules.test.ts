import { describe, expect, it } from 'vitest';
import { createBuilding } from './archetypes/building';
import { createVillager } from './archetypes/villager';
import { createWall } from './archetypes/wall';
import { escapeRulesAt } from './escapeRules';
import { createMiniSim } from './testing/miniSim';

describe('escapeRulesAt: a unit on blocked ground crosses only the structure it stands on', () => {
  it('a unit on a barracks next to an enemy wall walks off through the barracks ring, never through the wall', () => {
    const sim = createMiniSim(20);
    for (let x = 0; x < 20; x++) createWall(sim.world, { tile: { tx: x, ty: 11 }, playerId: 2, mapData: sim.map });
    createBuilding(sim.world, { type: 'house', origin: { tx: 3, ty: 9 }, playerId: 1, mapData: sim.map });
    createBuilding(sim.world, { type: 'house', origin: { tx: 8, ty: 9 }, playerId: 1, mapData: sim.map });
    // Laid without eviction: the unit's own systems must get it out.
    createBuilding(sim.world, { type: 'barracks', origin: { tx: 5, ty: 8 }, playerId: 1, mapData: sim.map, underConstruction: true });
    const v = createVillager(sim.world, { tile: { tx: 6, ty: 10 } });
    sim.world.addComponent(v, 'moveIntent', { target: { tx: 6, ty: 16 } });
    const visited: string[] = [];
    sim.run(20_000, 50, () => visited.push(`${v.position!.tx},${v.position!.ty}`));
    expect(visited.some((k) => k.endsWith(',11'))).toBe(false);
    expect(sim.map.isPassable(v.position!.tx, v.position!.ty)).toBe(true);
    expect(v.position!.ty).toBeLessThan(11);
  });

  it('a pocket step never cuts the corner of a wall segment, but may cut a house corner', () => {
    const sim = createMiniSim(20);
    const rules = escapeRulesAt(sim.world, { tx: 10, ty: 10 }, sim.map);
    createWall(sim.world, { tile: { tx: 9, ty: 10 }, playerId: 2, mapData: sim.map });
    createBuilding(sim.world, { type: 'house', origin: { tx: 11, ty: 9 }, playerId: 1, mapData: sim.map });
    expect(rules.cuttable(9, 10)).toBe(false);
    expect(rules.cuttable(11, 10)).toBe(true);
  });
});
