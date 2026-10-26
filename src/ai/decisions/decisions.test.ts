import { describe, expect, it } from 'vitest';
import type { Entity } from '../../ecs/components';
import { FogOfWarData } from '../../map/FogOfWarData';
import { MapData } from '../../map/MapData';
import { createRng } from '../../map/random';
import { TERRAIN } from '../../map/TerrainTypes';
import type { KnownBuilding } from '../perception';
import {
  attackReady,
  canPlaceAt,
  clusterAnchor,
  counterMix,
  enemyClassShares,
  findPlacement,
  needsHouse,
  nextExploreTarget,
  nextUnitToTrain,
  pickAttackTarget,
  pickEngageTarget,
  pickGatherType,
  pickRebalance,
  pickResearch,
  weightsForGoal,
} from '.';

const all = () => true;

describe('gathering decisions', () => {
  it('sends the next villager to the resource furthest below its share', () => {
    const w = { food: 0.5, wood: 0.3, gold: 0.2 };
    expect(pickGatherType({ food: 0, wood: 0, gold: 0 }, w, all)).toBe('food');
    expect(pickGatherType({ food: 5, wood: 1, gold: 2 }, w, all)).toBe('wood');
    // Nothing to mine: gold is skipped and the split renormalises.
    expect(pickGatherType({ food: 5, wood: 4, gold: 0 }, w, (t) => t !== 'gold')).toBe('food');
    expect(pickGatherType({ food: 0, wood: 0, gold: 0 }, w, () => false)).toBeNull();
  });

  it('moves a gatherer only when a resource is off by a full villager', () => {
    const w = { food: 0.5, wood: 0.5, gold: 0 };
    expect(pickRebalance({ food: 5, wood: 4, gold: 0 }, w, all)).toBeNull();
    expect(pickRebalance({ food: 8, wood: 2, gold: 0 }, w, all)).toEqual({ from: 'food', to: 'wood' });
    expect(pickRebalance({ food: 3, wood: 3, gold: 2 }, w, all)).toEqual({ from: 'gold', to: 'food' });
  });

  it('leans toward what a savings goal still lacks', () => {
    const base = { food: 0.5, wood: 0.3, gold: 0.2 };
    expect(weightsForGoal(base, { food: 500, wood: 0, gold: 300 }, { food: 900, wood: 0, gold: 300 }, 0.6)).toBe(base);
    const leaned = weightsForGoal(base, { food: 500, wood: 0, gold: 300 }, { food: 500, wood: 0, gold: 0 }, 0.6);
    expect(leaned.gold).toBeCloseTo(0.4 * 0.2 + 0.6, 5);
    expect(leaned.food + leaned.wood + leaned.gold).toBeCloseTo(1, 5);
  });
});

describe('housing', () => {
  it('builds a house when free slots drop to the margin, one at a time, below the hard cap', () => {
    expect(needsHouse({ current: 6, cap: 10 }, 0, 3)).toBe(false);
    expect(needsHouse({ current: 7, cap: 10 }, 0, 3)).toBe(true);
    expect(needsHouse({ current: 7, cap: 10 }, 1, 3)).toBe(false);
    expect(needsHouse({ current: 199, cap: 200 }, 0, 3)).toBe(false);
  });
});

describe('placement', () => {
  it('keeps a free ring around the footprint unless told otherwise', () => {
    const map = new MapData(12, 12);
    map.setBlocked(5, 3, true);
    expect(canPlaceAt(map, { tx: 3, ty: 3 }, 2, 2, { clearance: 0 })).toBe(true);
    expect(canPlaceAt(map, { tx: 3, ty: 3 }, 2, 2, { clearance: 1 })).toBe(false);
    expect(canPlaceAt(map, { tx: 3, ty: 3 }, 2, 2, { clearance: 1, mayTouch: (x, y) => x === 5 && y === 3 })).toBe(true);
    // The map edge does not count as an obstacle.
    expect(canPlaceAt(map, { tx: 0, ty: 0 }, 2, 2, { clearance: 1 })).toBe(true);
  });

  it('never covers a berry bush (the bush would be lost under the building)', () => {
    const map = new MapData(12, 12);
    map.setTile(4, 4, TERRAIN.berries);
    expect(canPlaceAt(map, { tx: 3, ty: 3 }, 3, 3, { clearance: 0 })).toBe(false);
    const spot = findPlacement(map, { tx: 4, ty: 4 }, 3, 3, { minRadius: 0, maxRadius: 4, clearance: 0 })!;
    const covers = spot.tx <= 4 && spot.tx + 2 >= 4 && spot.ty <= 4 && spot.ty + 2 >= 4;
    expect(covers).toBe(false);
  });

  it('natureMayTouch: trees may touch, buildings may not, and the trees and the building stay reachable', () => {
    const map = new MapData(12, 12);
    map.setTile(5, 3, TERRAIN.forest);
    const nature = { clearance: 1 as const, natureMayTouch: true };
    expect(canPlaceAt(map, { tx: 3, ty: 3 }, 2, 2, { clearance: 1 })).toBe(false);
    expect(canPlaceAt(map, { tx: 3, ty: 3 }, 2, 2, nature)).toBe(true);
    // A building in the ring is never accepted.
    map.setBlocked(2, 3, true);
    expect(canPlaceAt(map, { tx: 3, ty: 3 }, 2, 2, nature)).toBe(false);
    map.setBlocked(2, 3, false);
    // A tree whose only free neighbour the footprint would cover is cut off: rejected.
    // (5,4) in the ring: its other neighbours are trees or a building outside the ring (6,5).
    for (const [x, y] of [[6, 3], [6, 4], [5, 4], [4, 5], [5, 5]] as const) map.setTile(x, y, TERRAIN.forest);
    map.setBlocked(6, 5, true);
    expect(canPlaceAt(map, { tx: 3, ty: 3 }, 2, 2, nature)).toBe(false);
    // Free (5,4)'s corner neighbour and the spot is fine again.
    map.setBlocked(6, 5, false);
    expect(canPlaceAt(map, { tx: 3, ty: 3 }, 2, 2, nature)).toBe(true);
  });

  it('natureMayTouch keeps at least two free ring tiles', () => {
    const map = new MapData(12, 12);
    // Ring of a 1x1 at (5,5): trees everywhere but one tile.
    const ring = [[4, 4], [5, 4], [6, 4], [4, 5], [6, 5], [4, 6], [5, 6], [6, 6]] as const;
    for (const [x, y] of ring.slice(1)) map.setTile(x, y, TERRAIN.forest);
    expect(canPlaceAt(map, { tx: 5, ty: 5 }, 1, 1, { clearance: 1, natureMayTouch: true })).toBe(false);
    map.setTile(6, 6, TERRAIN.grass);
    expect(canPlaceAt(map, { tx: 5, ty: 5 }, 1, 1, { clearance: 1, natureMayTouch: true })).toBe(true);
  });

  it('searches rings outward from the anchor and honours tile rules', () => {
    const map = new MapData(20, 20);
    const spot = findPlacement(map, { tx: 10, ty: 10 }, 2, 2, { minRadius: 3, maxRadius: 6, clearance: 1 });
    expect(spot).not.toBeNull();
    expect(Math.max(Math.abs(spot!.tx - 10), Math.abs(spot!.ty - 10))).toBe(3);
    const none = findPlacement(map, { tx: 10, ty: 10 }, 2, 2, { minRadius: 3, maxRadius: 6, clearance: 1, tileAllowed: () => false });
    expect(none).toBeNull();
  });

  it('anchors camps on the nearest resource cluster', () => {
    const nodes = [{ position: { tx: 10, ty: 10 } }, { position: { tx: 12, ty: 10 } }, { position: { tx: 30, ty: 30 } }];
    expect(clusterAnchor(nodes, { tx: 0, ty: 0 }, 3)).toEqual({ tx: 11, ty: 10 });
    expect(clusterAnchor([], { tx: 0, ty: 0 }, 3)).toBeNull();
  });
});

describe('army decisions', () => {
  it('reads enemy classes from sightings', () => {
    expect(enemyClassShares({ knight: 3, archer: 1, villager: 9 })).toEqual({ cavalry: 0.75, archers: 0.25, infantry: 0 });
  });

  it('counters cavalry with pikemen and archers with knights, within what is unlocked', () => {
    const base = { knight: 0.4, crossbowman: 0.4, pikeman: 0.2 };
    const allowed = ['knight', 'crossbowman', 'pikeman', 'swordsman'] as const;
    const vsCav = counterMix(base, { knight: 10 }, allowed);
    expect(vsCav.pikeman!).toBeGreaterThan(0.2 + 0.1);
    const vsArchers = counterMix(base, { archer: 10 }, allowed);
    expect(vsArchers.knight!).toBeGreaterThan(0.4);
    expect(vsArchers.swordsman!).toBeGreaterThan(0);
    expect(vsArchers.pikeman ?? 0).toBeLessThan(0.2);
    const sum = Object.values(vsArchers).reduce((s, n) => s + n, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(counterMix(base, {}, ['pikeman'])).toEqual({ pikeman: 1 });
  });

  it('trains the unit type furthest below its share among trainable ones', () => {
    const mix = { knight: 0.4, crossbowman: 0.4, pikeman: 0.2 };
    expect(nextUnitToTrain(mix, {}, all)).toBe('knight');
    expect(nextUnitToTrain(mix, { knight: 2, crossbowman: 1, pikeman: 1 }, all)).toBe('crossbowman');
    expect(nextUnitToTrain(mix, { knight: 2, crossbowman: 1 }, (t) => t === 'pikeman')).toBe('pikeman');
    expect(nextUnitToTrain(mix, {}, () => false)).toBeNull();
  });
});

describe('combat decisions', () => {
  it('attacks once big enough and not before the earliest time', () => {
    expect(attackReady({ armySize: 12, wave: 12, timeMs: 6e5, notBeforeMs: 5e5 })).toBe(true);
    expect(attackReady({ armySize: 11, wave: 12, timeMs: 6e5, notBeforeMs: 5e5 })).toBe(false);
    expect(attackReady({ armySize: 20, wave: 12, timeMs: 4e5, notBeforeMs: 5e5 })).toBe(false);
  });

  it('targets the nearest remembered TC of the chosen enemy, else its nearest building', () => {
    const b = (id: number, type: KnownBuilding['type'], ownerId: number, tx: number): KnownBuilding => ({
      id, type, ownerId, position: { tx, ty: 0 }, footprint: { width: 1, height: 1 },
    });
    const known = [b(1, 'house', 1, 5), b(2, 'town_center', 1, 40), b(3, 'town_center', 3, 10)];
    expect(pickAttackTarget(known, { tx: 0, ty: 0 }, 1)?.id).toBe(2);
    expect(pickAttackTarget(known, { tx: 0, ty: 0 }, undefined)?.id).toBe(3);
    expect(pickAttackTarget([b(1, 'house', 1, 5)], { tx: 0, ty: 0 }, 1)?.id).toBe(1);
    expect(pickAttackTarget([], { tx: 0, ty: 0 }, 1)).toBeNull();
  });

  it('engages armed units first, then other units, then buildings (walls last)', () => {
    const at = (tx: number, extra: Partial<Entity> = {}): Entity => ({ position: { tx, ty: 0 }, ...extra });
    const villager = at(2);
    const soldier = at(5, { attacker: { meleeAtk: 1, pierceAtk: 0, bonusVsCavalry: 0, range: 1, cooldownMs: 1, cooldownRemaining: 0 } });
    const wall = at(1, { building: { type: 'wall', footprint: { width: 1, height: 1 } } });
    const house = at(3, { building: { type: 'house', footprint: { width: 2, height: 2 } } });
    const from = { tx: 0, ty: 0 };
    expect(pickEngageTarget(from, [villager, soldier], [wall, house], 9)).toBe(soldier);
    expect(pickEngageTarget(from, [villager], [wall, house], 9)).toBe(villager);
    expect(pickEngageTarget(from, [], [wall, house], 9)).toBe(house);
    expect(pickEngageTarget(from, [soldier], [], 4)).toBeNull();
  });
});

describe('scouting and research', () => {
  it('heads for unexplored ground near the scout, then refreshes stale areas', () => {
    const map = new MapData(32, 32);
    map.setTile(0, 0, TERRAIN.water);
    const fog = new FogOfWarData(32, 32);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 16; x++) fog.markVisible(x, y);
    const goal = nextExploreTarget(fog, map, { tx: 8, ty: 8 }, createRng(1));
    expect(goal!.tx).toBeGreaterThanOrEqual(16);
    for (let y = 0; y < 32; y++) for (let x = 16; x < 32; x++) fog.markVisible(x, y);
    fog.dimVisibleToExplored();
    for (let y = 0; y < 32; y++) for (let x = 0; x < 16; x++) fog.markVisible(x, y);
    const stale = nextExploreTarget(fog, map, { tx: 8, ty: 8 }, createRng(1));
    expect(fog.isVisible(stale!.tx, stale!.ty)).toBe(false);
  });

  it('researches the first ready technology in priority order', () => {
    expect(pickResearch(['armor_1', 'double_saw'], (id) => id === 'double_saw')).toBe('double_saw');
    expect(pickResearch(['armor_1'], () => false)).toBeNull();
  });
});
