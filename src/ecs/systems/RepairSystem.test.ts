import { describe, expect, it } from 'vitest';
import { createBuilding } from '../archetypes/building';
import { createUnit } from '../archetypes/createUnit';
import { createVillager } from '../archetypes/villager';
import type { Entity } from '../components';
import { clearUnitOrders } from '../orders';
import { createEcsWorld } from '../world';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { createPlayers } from '../../game/PlayerManager';
import { canRepair, startRepair } from '../../game/repair';
import { MatchStats } from '../../stats/MatchStats';
import type { CivId, Resources } from '../../types';
import { hu } from '../../i18n/hu';
import { MovementSystem } from './MovementSystem';
import { RepairSystem } from './RepairSystem';

const RICH: Resources = { food: 1000, wood: 1000, gold: 1000 };

function setup(opts: { civ?: CivId; resources?: Resources; allies?: number; houseOwner?: number } = {}) {
  const map = new MapData(20, 20, TERRAIN.grass);
  const world = createEcsWorld();
  const players = createPlayers(opts.civ ?? 'hungarian', ['english', 'german'], opts.resources ?? RICH, opts.allies ?? 0);
  // A house (500 HP, 25 s, 30 wood) at half HP.
  const house = createBuilding(world, { type: 'house', origin: { tx: 5, ty: 5 }, playerId: opts.houseOwner ?? 1, mapData: map });
  house.health!.current = 250;
  const notices: string[] = [];
  const system = new RepairSystem(world, map, undefined, players, { humanId: 1, notice: (m) => notices.push(m) });
  const villager = (tile: { tx: number; ty: number }, playerId = 1): Entity => {
    const v = createVillager(world, { tile, playerId });
    startRepair(world, v, house);
    return v;
  };
  return { map, world, players, house, system, notices, villager };
}

describe('RepairSystem: rate', () => {
  it('one adjacent villager restores maxHp / buildTime HP per second', () => {
    const { system, house, villager } = setup();
    villager({ tx: 4, ty: 5 });
    system.update(1000);
    expect(house.health!.current).toBe(270);
  });

  it('three villagers stack, and the HP never passes the maximum; then they all go idle', () => {
    const { system, house, villager } = setup();
    const vs = [villager({ tx: 4, ty: 5 }), villager({ tx: 7, ty: 5 }), villager({ tx: 5, ty: 4 })];
    system.update(1000);
    expect(house.health!.current).toBe(310);
    for (let i = 0; i < 100; i++) system.update(100);
    expect(house.health!.current).toBe(500);
    for (const v of vs) expect(v.repairIntent).toBeUndefined();
  });

  it('small steps accumulate whole HP (a Wonder restores under one HP per frame)', () => {
    const { world, map, players } = setup();
    const wonder = createBuilding(world, { type: 'wonder', origin: { tx: 12, ty: 12 }, playerId: 1, mapData: map });
    wonder.health!.current = 1000;
    const v = createVillager(world, { tile: { tx: 11, ty: 12 }, playerId: 1 });
    startRepair(world, v, wonder);
    const system = new RepairSystem(world, map, undefined, players);
    for (let i = 0; i < 61; i++) system.update(1000 / 60);
    // 4800 / 600 = 8 HP per second.
    expect(wonder.health!.current).toBe(1008);
    expect(Number.isInteger(wonder.health!.current)).toBe(true);
  });

  it('the Italian build bonus speeds it up', () => {
    const { system, house, villager } = setup({ civ: 'italian' });
    villager({ tx: 4, ty: 5 });
    system.update(1000);
    expect(house.health!.current).toBe(273);
  });

  it('a villager away from the building walks there first', () => {
    const { world, map, players, system, house, villager } = setup();
    const v = villager({ tx: 1, ty: 1 });
    const movement = new MovementSystem(world, players, map);
    for (let i = 0; i < 100; i++) {
      system.update(100);
      movement.update(100);
    }
    expect(house.health!.current).toBeGreaterThan(250);
    expect(v.repairIntent).toBeDefined();
  });
});

describe('RepairSystem: cost', () => {
  it('charges REPAIR.costFraction of the cost over the full HP, whole units, fractions carried', () => {
    const { system, players, villager } = setup();
    const v = villager({ tx: 4, ty: 5 });
    const wallet = () => players.get(1)!.resources;
    system.update(1000); // 20 HP × 15 / 500 = 0.6 wood
    expect(wallet().wood).toBe(1000);
    expect(v.repairIntent!.costCarry.wood).toBeCloseTo(0.6);
    system.update(1000); // 1.2 wood owed: 1 charged
    expect(wallet().wood).toBe(999);
    expect(v.repairIntent!.costCarry.wood).toBeCloseTo(0.2);
    for (let i = 0; i < 300; i++) system.update(100);
    // 250 HP: 7.5 wood, 7 charged; no food or gold (the house costs none).
    expect(wallet()).toEqual({ food: 1000, wood: 993, gold: 1000 });
  });

  it('a dry wallet stops the repair with one notice; nothing goes negative', () => {
    const { system, players, house, notices, villager } = setup({ resources: { food: 0, wood: 2, gold: 0 } });
    const a = villager({ tx: 4, ty: 5 });
    const b = villager({ tx: 7, ty: 5 });
    for (let i = 0; i < 200; i++) system.update(100);
    expect(players.get(1)!.resources.wood).toBe(0);
    expect(house.health!.current).toBeGreaterThan(250);
    expect(house.health!.current).toBeLessThan(400);
    expect(a.repairIntent).toBeUndefined();
    expect(b.repairIntent).toBeUndefined();
    expect(notices).toEqual([hu.repair.outOfResources]);
  });

  it("an AI's dry wallet stops its repair without a notice", () => {
    const { world, map, players, notices } = setup({ resources: { food: 0, wood: 0, gold: 0 } });
    const aiHouse = createBuilding(world, { type: 'house', origin: { tx: 12, ty: 12 }, playerId: 2, mapData: map });
    aiHouse.health!.current = 100;
    const v = createVillager(world, { tile: { tx: 11, ty: 12 }, playerId: 2 });
    startRepair(world, v, aiHouse);
    const system = new RepairSystem(world, map, undefined, players, { humanId: 1, notice: (m) => notices.push(m) });
    for (let i = 0; i < 50; i++) system.update(100);
    expect(v.repairIntent).toBeUndefined();
    expect(notices).toEqual([]);
    expect(players.get(2)!.resources.wood).toBe(0);
  });

  it("an ally's building is repaired with the villager owner's resources", () => {
    const { system, players, house, villager } = setup({ allies: 1, houseOwner: 2 });
    const v = villager({ tx: 4, ty: 5 });
    expect(v.repairIntent).toBeDefined();
    for (let i = 0; i < 300; i++) system.update(100);
    expect(house.health!.current).toBe(500);
    expect(players.get(1)!.resources.wood).toBe(993);
    expect(players.get(2)!.resources.wood).toBe(1000);
  });

  it('the human pays from the given wallet (the UI store in the game)', () => {
    const { world, map, players, house } = setup();
    let stock: Resources = { food: 0, wood: 50, gold: 0 };
    const system = new RepairSystem(world, map, undefined, players, {
      walletOf: (p) => (p.isHuman ? { get: () => stock, set: (n) => void (stock = n) } : { get: () => p.resources, set: (n) => void (p.resources = n) }),
    });
    const v = createVillager(world, { tile: { tx: 4, ty: 5 }, playerId: 1 });
    startRepair(world, v, house);
    for (let i = 0; i < 300; i++) system.update(100);
    expect(stock.wood).toBe(43);
    expect(players.get(1)!.resources.wood).toBe(1000);
  });
});

describe('RepairSystem: stopping', () => {
  it('a destroyed, enemy-owned or fully repaired target stops the repair', () => {
    const { world, system, house, villager } = setup();
    const v = villager({ tx: 4, ty: 5 });
    world.addComponent(house, 'dying', { ttlMs: 500 });
    system.update(100);
    expect(v.repairIntent).toBeUndefined();

    const s2 = setup();
    const v2 = s2.villager({ tx: 4, ty: 5 });
    s2.house.owner!.playerId = 3;
    s2.system.update(100);
    expect(v2.repairIntent).toBeUndefined();
    expect(s2.house.health!.current).toBe(250);

    const s3 = setup();
    const v3 = s3.villager({ tx: 4, ty: 5 });
    s3.house.health!.current = 500;
    s3.system.update(100);
    expect(v3.repairIntent).toBeUndefined();

    const s4 = setup();
    const v4 = s4.villager({ tx: 4, ty: 5 });
    s4.world.remove(s4.house);
    s4.system.update(100);
    expect(v4.repairIntent).toBeUndefined();
  });

  it('a new order drops the repair', () => {
    const { world, villager } = setup();
    const v = villager({ tx: 4, ty: 5 });
    clearUnitOrders(world, v);
    expect(v.repairIntent).toBeUndefined();
  });

  it('a completed repair counts once for the owner of the villager that restored the last HP', () => {
    const { world, players, system, villager } = setup();
    const stats = new MatchStats(world, players);
    const off = stats.attach();
    villager({ tx: 4, ty: 5 });
    villager({ tx: 7, ty: 5 });
    for (let i = 0; i < 200; i++) system.update(100);
    off();
    expect(stats.of(1).repairsDone).toBe(1);
    expect(stats.snapshot().players['1']!.repairsDone).toBe(1);
  });
});

describe('canRepair', () => {
  it('refuses foundations, Gaia, enemies, units (ships), full buildings and non-villagers; allows an ally', () => {
    const { world, map } = setup();
    const players = createPlayers('hungarian', ['english', 'german'], RICH, 1);
    const v = createVillager(world, { tile: { tx: 1, ty: 1 }, playerId: 1 });
    const damaged = (type: 'house' | 'barracks', origin: { tx: number; ty: number }, playerId: number, underConstruction = false) => {
      const b = createBuilding(world, { type, origin, playerId, mapData: map, underConstruction });
      b.health!.current = Math.max(1, Math.floor(b.health!.max / 2));
      return b;
    };
    expect(canRepair(world, v, damaged('house', { tx: 10, ty: 1 }, 1), players)).toBe(true);
    expect(canRepair(world, v, damaged('house', { tx: 13, ty: 1 }, 2), players)).toBe(true);
    expect(canRepair(world, v, damaged('house', { tx: 16, ty: 1 }, 3), players)).toBe(false);
    expect(canRepair(world, v, damaged('house', { tx: 10, ty: 10 }, 0), players)).toBe(false);
    expect(canRepair(world, v, damaged('barracks', { tx: 13, ty: 10 }, 1, true), players)).toBe(false);
    const full = createBuilding(world, { type: 'house', origin: { tx: 16, ty: 10 }, playerId: 1, mapData: map });
    expect(canRepair(world, v, full, players)).toBe(false);
    const ship = createUnit(world, { type: 'transport', tile: { tx: 1, ty: 16 }, playerId: 1 });
    ship.health!.current = 10;
    expect(canRepair(world, v, ship, players)).toBe(false);
    const sword = createUnit(world, { type: 'swordsman', tile: { tx: 2, ty: 1 }, playerId: 1 });
    expect(canRepair(world, sword, damaged('house', { tx: 1, ty: 13 }, 1), players)).toBe(false);
  });
});
