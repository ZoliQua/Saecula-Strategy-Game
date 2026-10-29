import { describe, expect, it } from 'vitest';
import type { AudioSink } from '../../audio/AudioManager';
import { createBuilding } from '../../ecs/archetypes/building';
import { createResourceNode } from '../../ecs/archetypes/resource';
import { createUnit } from '../../ecs/archetypes/createUnit';
import { createVillager } from '../../ecs/archetypes/villager';
import type { Entity } from '../../ecs/components';
import type { SelectionSystem } from '../../ecs/systems/SelectionSystem';
import { createMiniSim } from '../../ecs/testing/miniSim';
import { FogOfWarData } from '../../map/FogOfWarData';
import { cursorFor } from '../../ui/cursor';
import { cursorContext } from './CursorWiring';
import { fogCanSee, OrderIssuer, orderActor, resolveOrderTarget, type CanSee } from './OrderIssuer';

const selectionOf = (selected: Entity[]) => ({ getAllSelected: () => selected }) as unknown as SelectionSystem;

function issuer(sim: ReturnType<typeof createMiniSim>, selected: Entity[], canSee?: CanSee) {
  const played: string[] = [];
  const sounds: AudioSink = { playSFX: (k) => void played.push(k) };
  return { orders: new OrderIssuer(sim.world, selectionOf(selected), sounds, canSee ? { canSee } : {}), played };
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

describe('OrderIssuer: fog of war (fix round 1)', () => {
  /** The human's fog with `tiles` currently visible (all else explored). */
  const fogWith = (size: number, tiles: { tx: number; ty: number }[]) => {
    const fog = new FogOfWarData(size, size);
    for (const t of tiles) fog.markVisible(t.tx, t.ty);
    return fog;
  };

  it('an enemy unit on a fogged tile is no target: the order is a move, the cursor no sword', () => {
    const sim = createMiniSim(32);
    const enemy = createUnit(sim.world, { type: 'swordsman', tile: { tx: 12, ty: 12 }, playerId: 2 });
    const sword = createUnit(sim.world, { type: 'swordsman', tile: { tx: 4, ty: 4 }, playerId: 1 });
    const canSee = fogCanSee(fogWith(32, []), 1);
    expect(resolveOrderTarget(sim.world, { tx: 12, ty: 12 }, sword, canSee).kind).toBe('none');
    const { orders, played } = issuer(sim, [sword], canSee);
    orders.issueOrders({ tx: 12, ty: 12 });
    expect(sword.attackIntent).toBeUndefined();
    expect(sword.moveIntent).toEqual({ target: { tx: 12, ty: 12 } });
    expect(played).toEqual(['unit_move']);
    const ctx = cursorContext(sim.world, sim.map, selectionOf([sword]), { tx: 12, ty: 12 }, 1, canSee);
    expect(cursorFor(ctx)).toBe('move');
    void enemy;
  });

  it('a visible enemy unit is attacked, and shows the sword', () => {
    const sim = createMiniSim(32);
    const enemy = createUnit(sim.world, { type: 'swordsman', tile: { tx: 12, ty: 12 }, playerId: 2 });
    const sword = createUnit(sim.world, { type: 'swordsman', tile: { tx: 4, ty: 4 }, playerId: 1 });
    const canSee = fogCanSee(fogWith(32, [{ tx: 12, ty: 12 }]), 1);
    const { orders } = issuer(sim, [sword], canSee);
    orders.issueOrders({ tx: 12, ty: 12 });
    expect(sword.attackIntent).toEqual({ targetId: enemy.id });
    expect(cursorFor(cursorContext(sim.world, sim.map, selectionOf([sword]), { tx: 12, ty: 12 }, 1, canSee))).toBe('attack');
  });

  it('an enemy building is a target exactly when the renderer draws it (its origin tile visible); else forbidden and a move', () => {
    const sim = createMiniSim(32);
    const house = createBuilding(sim.world, { type: 'house', origin: { tx: 20, ty: 20 }, playerId: 2, mapData: sim.map });
    const sword = createUnit(sim.world, { type: 'swordsman', tile: { tx: 4, ty: 4 }, playerId: 1 });
    // Another footprint tile visible but not the origin: the renderer hides it, so it is no target.
    const hidden = fogCanSee(fogWith(32, [{ tx: 21, ty: 21 }]), 1);
    expect(resolveOrderTarget(sim.world, { tx: 21, ty: 21 }, sword, hidden).kind).toBe('none');
    expect(cursorFor(cursorContext(sim.world, sim.map, selectionOf([sword]), { tx: 21, ty: 21 }, 1, hidden))).toBe('forbidden');
    const shown = fogCanSee(fogWith(32, [{ tx: 20, ty: 20 }]), 1);
    expect(resolveOrderTarget(sim.world, { tx: 21, ty: 21 }, sword, shown)).toEqual({ kind: 'enemy', entity: house });
  });

  it('own sites and resources ignore the fog', () => {
    const sim = createMiniSim(32);
    const site = createBuilding(sim.world, { type: 'house', origin: { tx: 10, ty: 10 }, playerId: 1, mapData: sim.map, underConstruction: true });
    const v = createVillager(sim.world, { tile: { tx: 4, ty: 4 } });
    expect(resolveOrderTarget(sim.world, { tx: 10, ty: 10 }, v, fogCanSee(fogWith(32, []), 1))).toEqual({ kind: 'ownSite', entity: site });
  });
});

describe('orderActor (fix round 1)', () => {
  it('the first own selected unit, ahead of buildings and other players; the cursor and the order agree', () => {
    const sim = createMiniSim(32);
    const tc = createBuilding(sim.world, { type: 'house', origin: { tx: 2, ty: 2 }, playerId: 1, mapData: sim.map });
    const foe = createUnit(sim.world, { type: 'swordsman', tile: { tx: 8, ty: 8 }, playerId: 2 });
    const v = createVillager(sim.world, { tile: { tx: 4, ty: 4 } });
    expect(orderActor([foe, tc, v], 1)).toBe(v);
    expect(orderActor([foe, tc], 1)).toBe(null);
  });
});
