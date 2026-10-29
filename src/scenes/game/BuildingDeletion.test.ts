import { describe, expect, it } from 'vitest';
import { BUILDING_SPECS, createBuilding } from '../../ecs/archetypes/building';
import { createVillager } from '../../ecs/archetypes/villager';
import { ConstructionSystem } from '../../ecs/systems/ConstructionSystem';
import { createMiniSim } from '../../ecs/testing/miniSim';
import type { Wallet } from '../../ecs/research';
import { gameEvents } from '../../game/events';
import { computePopulation } from '../../game/population';
import type { Resources } from '../../types';
import { UNIT_SPECS } from '../../ecs/archetypes/unit';
import { TECH_SPECS } from '../../game/technologies';
import { resetUiStore, uiStore } from '../../ui/store';
import { deleteBuilding, deleteCommandHandler, deleteKeyHandler, deleteSelectedBuilding } from './BuildingDeletion';

function wallet(start: Resources = { food: 0, wood: 0, gold: 0 }): Wallet & { value: Resources } {
  const w = {
    value: { ...start },
    get: () => w.value,
    set: (next: Resources) => {
      w.value = { ...next };
    },
  };
  return w;
}

describe('deleting own buildings (M7 decision 6)', () => {
  it('a site with two builders refunds once and releases both builders', () => {
    const sim = createMiniSim(32);
    const site = createBuilding(sim.world, { type: 'house', origin: { tx: 10, ty: 10 }, playerId: 1, mapData: sim.map, underConstruction: true });
    const a = createVillager(sim.world, { tile: { tx: 9, ty: 10 } });
    const b = createVillager(sim.world, { tile: { tx: 9, ty: 11 } });
    sim.world.addComponent(a, 'buildCommand', { targetId: site.id! });
    sim.world.addComponent(b, 'buildCommand', { targetId: site.id! });
    const w = wallet();
    const first = deleteBuilding(sim.world, site, 1, w);
    const second = deleteBuilding(sim.world, site, 1, w);
    new ConstructionSystem(sim.world, sim.map).update(100);
    const cost = BUILDING_SPECS.house.cost;
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(w.value).toEqual({ food: Math.round(cost.food * 0.8), wood: Math.round(cost.wood * 0.8), gold: Math.round(cost.gold * 0.8) });
    expect(site.dying).toBeDefined();
    expect(a.buildCommand).toBeUndefined();
    expect(b.buildCommand).toBeUndefined();
  });

  it('refunds by progress: a 49 % site returns 41 %, a 51 % site nothing', () => {
    const sim = createMiniSim(32);
    const half = createBuilding(sim.world, { type: 'barracks', origin: { tx: 4, ty: 4 }, playerId: 1, mapData: sim.map, underConstruction: true });
    half.underConstruction!.elapsed = half.underConstruction!.totalTime * 0.49;
    const past = createBuilding(sim.world, { type: 'barracks', origin: { tx: 12, ty: 4 }, playerId: 1, mapData: sim.map, underConstruction: true });
    past.underConstruction!.elapsed = past.underConstruction!.totalTime * 0.51;
    const cost = BUILDING_SPECS.barracks.cost;
    expect(deleteBuilding(sim.world, half, 1, wallet()).refund).toEqual({
      food: Math.round(cost.food * 0.41),
      wood: Math.round(cost.wood * 0.41),
      gold: Math.round(cost.gold * 0.41),
    });
    expect(deleteBuilding(sim.world, past, 1, wallet()).refund).toEqual({ food: 0, wood: 0, gold: 0 });
    expect(past.dying).toBeDefined();
  });

  it('a finished house is deleted without refund and lowers the population cap like a destroyed one', () => {
    const sim = createMiniSim(32);
    createBuilding(sim.world, { type: 'town_center', origin: { tx: 2, ty: 2 }, playerId: 1, mapData: sim.map });
    const house = createBuilding(sim.world, { type: 'house', origin: { tx: 10, ty: 10 }, playerId: 1, mapData: sim.map });
    const before = computePopulation(sim.world.entities, 1, 0).cap;
    const w = wallet({ food: 5, wood: 5, gold: 5 });
    const result = deleteBuilding(sim.world, house, 1, w);
    expect(result.ok).toBe(true);
    expect(w.value).toEqual({ food: 5, wood: 5, gold: 5 });
    expect(computePopulation(sim.world.entities, 1, 0).cap).toBeLessThan(before);
  });

  it('refuses another player\'s building, and emits buildingDeleted (not a kill) for its own', () => {
    const sim = createMiniSim(32);
    const enemy = createBuilding(sim.world, { type: 'house', origin: { tx: 10, ty: 10 }, playerId: 2, mapData: sim.map });
    const own = createBuilding(sim.world, { type: 'house', origin: { tx: 4, ty: 4 }, playerId: 1, mapData: sim.map });
    const seen: number[] = [];
    const off = gameEvents.on('buildingDeleted', ({ entityId }) => void seen.push(entityId));
    expect(deleteBuilding(sim.world, enemy, 1, wallet()).ok).toBe(false);
    expect(enemy.dying).toBeUndefined();
    expect(deleteBuilding(sim.world, own, 1, wallet()).ok).toBe(true);
    off();
    expect(seen).toEqual([own.id]);
  });

  it('deleteSelectedBuilding deletes the selected own building and deselects it', () => {
    const sim = createMiniSim(32);
    const own = createBuilding(sim.world, { type: 'house', origin: { tx: 4, ty: 4 }, playerId: 1, mapData: sim.map });
    own.selectable!.selected = true;
    expect(deleteSelectedBuilding(sim.world, own.id!, 1, wallet()).ok).toBe(true);
    expect(own.dying).toBeDefined();
    expect(own.selectable!.selected).toBe(false);
    expect(deleteSelectedBuilding(sim.world, 99999, 1, wallet()).ok).toBe(false);
  });

  it('refunds the queued units at full cost and the research in progress before the building goes', () => {
    const sim = createMiniSim(32);
    const tc = createBuilding(sim.world, { type: 'town_center', origin: { tx: 4, ty: 4 }, playerId: 1, mapData: sim.map });
    tc.trainingQueue!.entries.push(
      { unitType: 'villager', elapsed: 3, totalTime: 10 },
      { unitType: 'villager', elapsed: 0, totalTime: 10 },
    );
    const smith = createBuilding(sim.world, { type: 'blacksmith', origin: { tx: 12, ty: 4 }, playerId: 1, mapData: sim.map });
    sim.world.addComponent(smith, 'research', { techId: 'armor_1', elapsed: 5, totalTime: 30 });
    const w = wallet();
    deleteBuilding(sim.world, tc, 1, w);
    const v = UNIT_SPECS.villager.cost;
    expect(w.value).toEqual({ food: 2 * v.food, wood: 2 * v.wood, gold: 2 * v.gold });
    expect(tc.trainingQueue!.entries).toHaveLength(0);
    const w2 = wallet();
    deleteBuilding(sim.world, smith, 1, w2);
    expect(w2.value).toEqual(TECH_SPECS.armor_1.cost);
    expect(smith.research).toBeUndefined();
  });
});

describe('the delete key', () => {
  it('ignores auto-repeat, so holding the key cannot confirm its own arm', () => {
    resetUiStore();
    uiStore.getState().setSelectedEntity({
      kind: 'building', id: 3, ownerId: 1, buildingType: 'house', civ: 'hungarian', hp: { current: 1, max: 1 }, tile: { tx: 0, ty: 0 },
    });
    const onKey = deleteKeyHandler(1);
    onKey({ repeat: false });
    expect(uiStore.getState().deleteArmedId).toBe(3);
    onKey({ repeat: true });
    onKey({ repeat: true });
    expect(uiStore.getState().deleteArmedId).toBe(3);
  });
});

describe('the refund shown when armed is the refund paid (final review)', () => {
  it('a locked percentage is paid even if the site passed half built before the confirm', () => {
    const sim = createMiniSim(32);
    const site = createBuilding(sim.world, { type: 'barracks', origin: { tx: 4, ty: 4 }, playerId: 1, mapData: sim.map, underConstruction: true });
    site.underConstruction!.elapsed = site.underConstruction!.totalTime * 0.6;
    const cost = BUILDING_SPECS.barracks.cost;
    expect(deleteBuilding(sim.world, site, 1, wallet(), 41).refund).toEqual({
      food: Math.round(cost.food * 0.41),
      wood: Math.round(cost.wood * 0.41),
      gold: Math.round(cost.gold * 0.41),
    });
  });

  it('a finished building pays nothing whatever the lock says', () => {
    const sim = createMiniSim(32);
    const house = createBuilding(sim.world, { type: 'house', origin: { tx: 4, ty: 4 }, playerId: 1, mapData: sim.map });
    expect(deleteBuilding(sim.world, house, 1, wallet(), 80).refund).toEqual({ food: 0, wood: 0, gold: 0 });
  });

  it('arm locks min(shown, live rule at arm time); the confirm pays the lock, not the live rule', () => {
    resetUiStore();
    const sim = createMiniSim(32);
    const site = createBuilding(sim.world, { type: 'barracks', origin: { tx: 4, ty: 4 }, playerId: 1, mapData: sim.map, underConstruction: true });
    const uc = site.underConstruction!;
    uc.elapsed = uc.totalTime * 0.49;
    const w = wallet();
    const handle = deleteCommandHandler(sim.world, 1, () => w);
    // The HUD's progress lags (it read 30 %, i.e. 56 %); the live rule at arm time allows 41 %.
    uiStore.getState().setDeleteArmed(site.id!, 56);
    handle({ type: 'arm-delete', buildingId: site.id!, refundPct: 56 });
    expect(uiStore.getState().deleteArmedPct).toBe(41);
    // Building goes on past half built before the second press.
    uc.elapsed = uc.totalTime * 0.55;
    handle({ type: 'delete-building', buildingId: site.id!, refundPct: 41 });
    const cost = BUILDING_SPECS.barracks.cost;
    expect(w.value).toEqual({ food: Math.round(cost.food * 0.41), wood: Math.round(cost.wood * 0.41), gold: Math.round(cost.gold * 0.41) });
    expect(site.dying).toBeDefined();
  });

  it('a shown percentage under the live rule is kept; a command claiming more than its arm is capped', () => {
    resetUiStore();
    const sim = createMiniSim(32);
    const site = createBuilding(sim.world, { type: 'barracks', origin: { tx: 4, ty: 4 }, playerId: 1, mapData: sim.map, underConstruction: true });
    site.underConstruction!.elapsed = site.underConstruction!.totalTime * 0.1;
    const w = wallet();
    const handle = deleteCommandHandler(sim.world, 1, () => w);
    uiStore.getState().setDeleteArmed(site.id!, 60);
    handle({ type: 'arm-delete', buildingId: site.id!, refundPct: 60 });
    expect(uiStore.getState().deleteArmedPct).toBe(60);
    handle({ type: 'delete-building', buildingId: site.id!, refundPct: 80 });
    const cost = BUILDING_SPECS.barracks.cost;
    expect(w.value).toEqual({ food: Math.round(cost.food * 0.6), wood: Math.round(cost.wood * 0.6), gold: Math.round(cost.gold * 0.6) });
  });

  it('a delete without an arm pays at most the live rule', () => {
    const sim = createMiniSim(32);
    const site = createBuilding(sim.world, { type: 'barracks', origin: { tx: 4, ty: 4 }, playerId: 1, mapData: sim.map, underConstruction: true });
    site.underConstruction!.elapsed = site.underConstruction!.totalTime * 0.6;
    const w = wallet();
    deleteCommandHandler(sim.world, 1, () => w)({ type: 'delete-building', buildingId: site.id!, refundPct: 80 });
    expect(w.value).toEqual({ food: 0, wood: 0, gold: 0 });
    expect(site.dying).toBeDefined();
  });
});
