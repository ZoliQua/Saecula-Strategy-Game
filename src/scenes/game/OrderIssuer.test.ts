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
import { TERRAIN } from '../../map/TerrainTypes';
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

describe('OrderIssuer: conversion (M11)', () => {
  it('a monk ordered onto an enemy unit converts it; the swordsman beside it attacks; a building is just a walk', () => {
    const sim = createMiniSim(32);
    const monk = createUnit(sim.world, { type: 'monk', tile: { tx: 4, ty: 4 }, playerId: 1 });
    const sword = createUnit(sim.world, { type: 'swordsman', tile: { tx: 5, ty: 4 }, playerId: 1 });
    const knight = createUnit(sim.world, { type: 'knight', tile: { tx: 12, ty: 4 }, playerId: 2 });
    createBuilding(sim.world, { type: 'house', origin: { tx: 20, ty: 20 }, playerId: 2, mapData: sim.map });
    const { orders, played } = issuer(sim, [monk, sword]);
    orders.issueOrders({ tx: 12, ty: 4 });
    expect(monk.convertIntent).toEqual({ targetId: knight.id, elapsedMs: 0 });
    expect(sword.attackIntent).toEqual({ targetId: knight.id });
    expect(played).toEqual(['unit_attack']);
    orders.issueOrders({ tx: 20, ty: 20 });
    expect(monk.convertIntent).toBeUndefined();
    expect(monk.moveIntent).toBeDefined();
  });

  it('the cursor shows convert for a ready monk on a convertible enemy, never for an enemy monk or while recharging', () => {
    const sim = createMiniSim(32);
    const monk = createUnit(sim.world, { type: 'monk', tile: { tx: 4, ty: 4 }, playerId: 1 });
    createUnit(sim.world, { type: 'knight', tile: { tx: 12, ty: 4 }, playerId: 2 });
    createUnit(sim.world, { type: 'monk', tile: { tx: 14, ty: 4 }, playerId: 2 });
    const cursorAt = (tx: number) => cursorFor(cursorContext(sim.world, sim.map, selectionOf([monk]), { tx, ty: 4 }, 1));
    expect(cursorAt(12)).toBe('convert');
    expect(cursorAt(14)).toBe('move');
    monk.converter!.rechargeMs = 5000;
    expect(cursorAt(12)).toBe('move');
  });

  it('a recharging monk right-clicked onto an enemy walks there (as its cursor says), it does not stand still', () => {
    const sim = createMiniSim(32);
    const monk = createUnit(sim.world, { type: 'monk', tile: { tx: 4, ty: 4 }, playerId: 1 });
    createUnit(sim.world, { type: 'knight', tile: { tx: 12, ty: 4 }, playerId: 2 });
    monk.converter!.rechargeMs = 5000;
    const { orders, played } = issuer(sim, [monk]);
    orders.issueOrders({ tx: 12, ty: 4 });
    expect(monk.convertIntent).toBeUndefined();
    expect(monk.moveIntent?.target).toEqual({ tx: 12, ty: 4 });
    expect(played).toEqual(['unit_move']);
  });
});


describe('OrderIssuer: ships and workers (M14)', () => {
  it('a fishing boat fishes a fish school, a villager does not; a boat neither builds nor picks berries', () => {
    const sim = createMiniSim(32);
    for (let ty = 0; ty < 32; ty++) for (let tx = 16; tx < 32; tx++) sim.map.setTile(tx, ty, TERRAIN.water);
    sim.map.setTile(20, 10, TERRAIN.fish);
    const fish = createResourceNode(sim.world, { tile: { tx: 20, ty: 10 }, type: 'food', sea: true });
    sim.map.setTile(8, 8, TERRAIN.berries);
    const bush = createResourceNode(sim.world, { tile: { tx: 8, ty: 8 }, type: 'food' });
    const site = createBuilding(sim.world, { type: 'house', origin: { tx: 4, ty: 12 }, playerId: 1, mapData: sim.map, underConstruction: true });
    const boat = createUnit(sim.world, { type: 'fishing_boat', tile: { tx: 18, ty: 10 }, playerId: 1 });
    const v = createVillager(sim.world, { tile: { tx: 12, ty: 10 } });
    const { orders } = issuer(sim, [boat, v]);
    orders.issueOrders({ tx: 20, ty: 10 });
    expect(boat.gatherIntent).toEqual({ nodeId: fish.id });
    expect(v.gatherIntent).toBeUndefined();
    const { orders: again } = issuer(sim, [boat]);
    again.issueOrders({ tx: 8, ty: 8 });
    expect(boat.gatherIntent).toBeUndefined();
    expect(bush.resourceNode).toBeDefined();
    again.issueOrders({ tx: 5, ty: 13 });
    expect(boat.buildCommand).toBeUndefined();
    expect(site.underConstruction).toBeDefined();
  });
});
