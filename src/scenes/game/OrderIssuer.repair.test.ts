import { describe, expect, it } from 'vitest';
import { createBuilding } from '../../ecs/archetypes/building';
import { createUnit } from '../../ecs/archetypes/createUnit';
import { createVillager } from '../../ecs/archetypes/villager';
import type { Entity } from '../../ecs/components';
import type { SelectionSystem } from '../../ecs/systems/SelectionSystem';
import { createMiniSim } from '../../ecs/testing/miniSim';
import { createPlayers } from '../../game/PlayerManager';
import { cursorFor } from '../../ui/cursor';
import { cursorContext } from './CursorWiring';
import { OrderIssuer, resolveOrderTarget } from './OrderIssuer';

const selectionOf = (selected: Entity[]) => ({ getAllSelected: () => selected }) as unknown as SelectionSystem;

function scene(allies = 0) {
  const sim = createMiniSim(32);
  const players = createPlayers('hungarian', ['english', 'german'], undefined, allies);
  const damaged = (origin: { tx: number; ty: number }, playerId: number) => {
    const b = createBuilding(sim.world, { type: 'house', origin, playerId, mapData: sim.map });
    b.health!.current = 200;
    return b;
  };
  const issue = (selected: Entity[], tile: { tx: number; ty: number }) => {
    const played: string[] = [];
    new OrderIssuer(sim.world, selectionOf(selected), { playSFX: (k) => void played.push(k) }, { map: sim.map, teams: players }).issueOrders(tile);
    return played;
  };
  return { sim, players, damaged, issue };
}

describe('OrderIssuer: repair (M18)', () => {
  it('a villager right-clicked on a damaged own building repairs it; a soldier walks there', () => {
    const { sim, players, damaged, issue } = scene();
    const house = damaged({ tx: 10, ty: 10 }, 1);
    const v = createVillager(sim.world, { tile: { tx: 4, ty: 4 } });
    const sword = createUnit(sim.world, { type: 'swordsman', tile: { tx: 5, ty: 4 }, playerId: 1 });
    expect(resolveOrderTarget(sim.world, { tx: 11, ty: 11 }, v, undefined, players)).toEqual({ kind: 'repair', entity: house });
    expect(issue([v, sword], { tx: 11, ty: 11 })).toEqual(['unit_move']);
    expect(v.repairIntent?.targetId).toBe(house.id);
    expect(sword.repairIntent).toBeUndefined();
    expect(sword.moveIntent).toBeDefined();
  });

  it('a full building is no repair target; a foundation stays a build order', () => {
    const { sim, issue } = scene();
    createBuilding(sim.world, { type: 'house', origin: { tx: 10, ty: 10 }, playerId: 1, mapData: sim.map });
    const site = createBuilding(sim.world, { type: 'house', origin: { tx: 20, ty: 20 }, playerId: 1, mapData: sim.map, underConstruction: true });
    const v = createVillager(sim.world, { tile: { tx: 4, ty: 4 } });
    issue([v], { tx: 10, ty: 10 });
    expect(v.repairIntent).toBeUndefined();
    expect(v.moveIntent).toBeDefined();
    issue([v], { tx: 20, ty: 20 });
    expect(v.buildCommand).toEqual({ targetId: site.id });
    expect(v.repairIntent).toBeUndefined();
  });

  it("an ally's damaged building is repaired; an enemy's is attacked, Gaia's too", () => {
    const { sim, players, damaged, issue } = scene(1);
    const ally = damaged({ tx: 10, ty: 10 }, 2);
    const enemy = damaged({ tx: 20, ty: 10 }, 3);
    const gaia = damaged({ tx: 20, ty: 20 }, 0);
    const v = createVillager(sim.world, { tile: { tx: 4, ty: 4 } });
    issue([v], { tx: 10, ty: 10 });
    expect(v.repairIntent?.targetId).toBe(ally.id);
    expect(resolveOrderTarget(sim.world, { tx: 20, ty: 10 }, v, undefined, players)).toEqual({ kind: 'enemy', entity: enemy });
    expect(resolveOrderTarget(sim.world, { tx: 20, ty: 20 }, v, undefined, players)).toEqual({ kind: 'enemy', entity: gaia });
    issue([v], { tx: 20, ty: 10 });
    expect(v.repairIntent).toBeUndefined();
  });

  it('the cursor shows the hammer over a repairable building for a villager, not for a soldier', () => {
    const { sim, players, damaged } = scene();
    damaged({ tx: 10, ty: 10 }, 1);
    const v = createVillager(sim.world, { tile: { tx: 4, ty: 4 } });
    const sword = createUnit(sim.world, { type: 'swordsman', tile: { tx: 5, ty: 4 }, playerId: 1 });
    const at = (selected: Entity[]) => cursorFor(cursorContext(sim.world, sim.map, selectionOf(selected), { tx: 10, ty: 10 }, 1, undefined, players));
    expect(at([v])).toBe('build');
    expect(at([sword])).toBe('forbidden');
  });
});
