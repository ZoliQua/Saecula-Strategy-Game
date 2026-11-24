import { describe, expect, it } from 'vitest';
import { TRADE } from '../../config/balance';
import { createBuilding } from '../../ecs/archetypes/building';
import { createUnit } from '../../ecs/archetypes/createUnit';
import type { Entity } from '../../ecs/components';
import type { SelectionSystem } from '../../ecs/systems/SelectionSystem';
import { createMiniSim } from '../../ecs/testing/miniSim';
import { createPlayers } from '../../game/PlayerManager';
import type { TreatyGate } from '../../game/treaty';
import { hu } from '../../i18n/hu';
import { TERRAIN } from '../../map/TerrainTypes';
import { cursorFor } from '../../ui/cursor';
import { cursorContext } from './CursorWiring';
import { OrderIssuer } from './OrderIssuer';

const selectionOf = (selected: Entity[]) => ({ getAllSelected: () => selected }) as unknown as SelectionSystem;

/** Human (1) and an allied AI (2) on a 64-tile grass map, an enemy AI (3); the human's home market at (2, 2). */
function setup(treatyOn = false) {
  const sim = createMiniSim(64);
  const players = createPlayers('hungarian', ['english', 'german'], undefined, 1);
  const treaty: TreatyGate = () => treatyOn;
  const notices: string[] = [];
  const market = (tx: number, ty: number, playerId: number, underConstruction = false) =>
    createBuilding(sim.world, { type: 'market', origin: { tx, ty }, playerId, mapData: sim.map, underConstruction });
  const home = market(2, 2, 1);
  const cart = createUnit(sim.world, { type: 'trade_cart', tile: { tx: 5, ty: 3 }, playerId: 1 });
  sim.world.addComponent(cart, 'tradeHome', { buildingId: home.id! });
  const sword = createUnit(sim.world, { type: 'swordsman', tile: { tx: 6, ty: 6 }, playerId: 1 });
  const orders = (selected: Entity[]) =>
    new OrderIssuer(sim.world, selectionOf(selected), { playSFX: () => {} }, { map: sim.map, teams: players, treaty, notice: (m) => void notices.push(m) });
  const cursor = (selected: Entity[], tx: number, ty: number) =>
    cursorFor(cursorContext(sim.world, sim.map, selectionOf(selected), { tx, ty }, 1, undefined, players, treaty));
  return { sim, players, notices, market, home, cart, sword, orders, cursor };
}

describe('trade route orders (M17)', () => {
  it('a right-click on a far own market sets the route, with the trade cursor over it', () => {
    const { market, cart, orders, cursor, home, notices } = setup();
    const far = market(40, 40, 1);
    expect(cursor([cart], 41, 41)).toBe('trade');
    orders([cart]).issueOrders({ tx: 41, ty: 41 });
    expect(cart.tradeRoute).toEqual({ homeId: home.id, targetId: far.id, toTarget: true, armed: true });
    expect(notices).toEqual([]);
  });

  it("an ally's market is a route too, even during the treaty", () => {
    const { market, cart, orders } = setup(true);
    const ally = market(40, 40, 2);
    orders([cart]).issueOrders({ tx: 41, ty: 41 });
    expect(cart.tradeRoute?.targetId).toBe(ally.id);
  });

  it('two own markets closer than TRADE.minDistance: refused with a Hungarian notice, no route, no move', () => {
    const { market, cart, orders, cursor, notices } = setup();
    market(2 + TRADE.minDistance - 5, 2, 1);
    const tx = 2 + TRADE.minDistance - 4;
    expect(cursor([cart], tx, 3)).toBe('forbidden');
    orders([cart]).issueOrders({ tx, ty: 3 });
    expect(cart.tradeRoute).toBeUndefined();
    expect(cart.moveIntent).toBeUndefined();
    expect(notices).toEqual([hu.trade.tooClose(TRADE.minDistance)]);
  });

  it("an unfinished market and an enemy's market are refused with notices", () => {
    const { market, cart, orders, notices } = setup();
    market(40, 40, 1, true);
    market(40, 10, 3);
    orders([cart]).issueOrders({ tx: 41, ty: 41 });
    orders([cart]).issueOrders({ tx: 41, ty: 11 });
    expect(cart.tradeRoute).toBeUndefined();
    expect(notices).toEqual([hu.trade.unfinished, hu.trade.notFriendly]);
  });

  it('a market across the water is refused with a Hungarian notice and no trade cursor', () => {
    const { sim, market, cart, orders, cursor, notices } = setup();
    for (let i = 0; i < 64; i++) for (let k = 30; k < 33; k++) sim.map.setTile(i, k, TERRAIN.water);
    market(40, 40, 1);
    expect(cursor([cart], 41, 41)).toBe('forbidden');
    orders([cart]).issueOrders({ tx: 41, ty: 41 });
    expect(cart.tradeRoute).toBeUndefined();
    expect(notices).toEqual([hu.trade.unreachable]);
  });

  it('a refused order keeps the current route', () => {
    const { market, cart, orders } = setup();
    const far = market(40, 40, 1);
    orders([cart]).issueOrders({ tx: 41, ty: 41 });
    market(10, 2, 1);
    orders([cart]).issueOrders({ tx: 11, ty: 3 });
    expect(cart.tradeRoute?.targetId).toBe(far.id);
  });

  it('other units in the selection just walk to the market', () => {
    const { market, cart, sword, orders } = setup();
    market(40, 40, 1);
    orders([cart, sword]).issueOrders({ tx: 41, ty: 41 });
    expect(cart.tradeRoute).toBeDefined();
    expect(sword.moveIntent?.target).toEqual({ tx: 41, ty: 41 });
  });
});
