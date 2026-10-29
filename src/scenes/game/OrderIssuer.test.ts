import { describe, expect, it } from 'vitest';
import type { AudioSink } from '../../audio/AudioManager';
import { createBuilding } from '../../ecs/archetypes/building';
import { createResourceNode } from '../../ecs/archetypes/resource';
import { createUnit } from '../../ecs/archetypes/createUnit';
import { createVillager } from '../../ecs/archetypes/villager';
import type { Entity } from '../../ecs/components';
import type { SelectionSystem } from '../../ecs/systems/SelectionSystem';
import { createMiniSim } from '../../ecs/testing/miniSim';
import { OrderIssuer, resolveOrderTarget } from './OrderIssuer';

function issuer(sim: ReturnType<typeof createMiniSim>, selected: Entity[]) {
  const played: string[] = [];
  const sounds: AudioSink = { playSFX: (k) => void played.push(k) };
  const selection = { getAllSelected: () => selected } as unknown as SelectionSystem;
  return { orders: new OrderIssuer(sim.world, selection, sounds), played };
}

describe('OrderIssuer: help build (M7 decision 2)', () => {
  it('a right-click on an own site sends every selected villager to build it, others move; two builders build faster', () => {
    const sim = createMiniSim(32);
    const site = createBuilding(sim.world, { type: 'barracks', origin: { tx: 10, ty: 10 }, playerId: 1, mapData: sim.map, underConstruction: true });
    const a = createVillager(sim.world, { tile: { tx: 4, ty: 4 } });
    const b = createVillager(sim.world, { tile: { tx: 5, ty: 4 } });
    const sword = createUnit(sim.world, { type: 'swordsman', tile: { tx: 6, ty: 4 }, playerId: 1 });
    const { orders, played } = issuer(sim, [a, b, sword]);
    orders.issueOrders({ tx: 11, ty: 11 });
    expect(a.buildCommand).toEqual({ targetId: site.id });
    expect(b.buildCommand).toEqual({ targetId: site.id });
    expect(sword.buildCommand).toBeUndefined();
    expect(sword.moveIntent).toBeDefined();
    expect(played).toEqual(['unit_move']);

    // Both reach the site; then the build rate is two builder-seconds per second.
    sim.run(10_000);
    const before = site.underConstruction!.elapsed;
    expect(before).toBeGreaterThan(0);
    sim.run(2000);
    expect(site.underConstruction!.elapsed - before).toBeCloseTo(4, 1);
  });

  it('a dying or enemy site is not a help-build target', () => {
    const sim = createMiniSim(32);
    const own = createBuilding(sim.world, { type: 'house', origin: { tx: 10, ty: 10 }, playerId: 1, mapData: sim.map, underConstruction: true });
    const enemy = createBuilding(sim.world, { type: 'house', origin: { tx: 20, ty: 20 }, playerId: 2, mapData: sim.map, underConstruction: true });
    const v = createVillager(sim.world, { tile: { tx: 4, ty: 4 } });
    expect(resolveOrderTarget(sim.world, { tx: 10, ty: 10 }, v)).toEqual({ kind: 'ownSite', entity: own });
    expect(resolveOrderTarget(sim.world, { tx: 21, ty: 21 }, v)).toEqual({ kind: 'enemy', entity: enemy });
    sim.world.addComponent(own, 'dying', { ttlMs: 500 });
    expect(resolveOrderTarget(sim.world, { tx: 10, ty: 10 }, v).kind).toBe('none');
  });

  it('resolves resources and empty ground', () => {
    const sim = createMiniSim(32);
    const tree = createResourceNode(sim.world, { tile: { tx: 3, ty: 3 }, type: 'wood' });
    const v = createVillager(sim.world, { tile: { tx: 4, ty: 4 } });
    expect(resolveOrderTarget(sim.world, { tx: 3, ty: 3 }, v)).toEqual({ kind: 'resource', entity: tree });
    expect(resolveOrderTarget(sim.world, { tx: 8, ty: 8 }, v)).toEqual({ kind: 'none', entity: null });
  });
});
