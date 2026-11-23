import { afterEach, describe, expect, it } from 'vitest';
import { TRADE } from '../../config/balance';
import { convertUnit } from '../../game/convert';
import { createPlayer } from '../../game/Player';
import { PlayerManager } from '../../game/PlayerManager';
import { checkTradeRoute, startTradeRoute, tradeDistance, tradeGoldPerTrip } from '../../game/trade';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { MatchStats } from '../../stats/MatchStats';
import { resetUiStore, uiStore } from '../../ui/store';
import { createBuilding } from '../archetypes/building';
import { createUnit } from '../archetypes/createUnit';
import type { Entity } from '../components';
import { clearUnitOrders } from '../orders';
import { createEcsWorld, type EcsWorld } from '../world';
import { MovementSystem } from './MovementSystem';
import { PathfindingSystem } from './PathfindingSystem';
import { TradeSystem } from './TradeSystem';
import { TrainingSystem } from './TrainingSystem';
import { toSelectedInfo, type SelectableWithPos } from './selectedInfo';
import { tradeRouteView } from '../../game/trade';
import { routeText } from '../../ui/panels/SelectionPanel';
import { hu } from '../../i18n/hu';

/** A 70×20 grass strip; player 1 (human) and 2 are allies when `allies`, 3 is an enemy. */
function setup(allies = false) {
  const map = new MapData(70, 20, TERRAIN.grass);
  const world = createEcsWorld();
  const players = new PlayerManager([1, 2, 3].map((id) => createPlayer({ id, isHuman: id === 1 })));
  players.assignTeams(allies ? 1 : 0);
  const trade = new TradeSystem(world, map, players);
  const pathing = new PathfindingSystem(world, map);
  const movement = new MovementSystem(world, players, map);
  const step = (ms: number) => {
    for (let t = 0; t < ms; t += 100) {
      pathing.update();
      trade.update(100);
      movement.update(100);
    }
  };
  return { map, world, players, step };
}

function market(world: EcsWorld, map: MapData, tx: number, playerId = 1, underConstruction = false): Entity {
  return createBuilding(world, { type: 'market', origin: { tx, ty: 8 }, playerId, mapData: map, underConstruction });
}

/** A cart trained at `home` (its tradeHome), standing beside it. */
function cart(world: EcsWorld, home: Entity, playerId = 1): Entity {
  const c = createUnit(world, { type: 'trade_cart', tile: { tx: home.position!.tx + 3, ty: 9 }, playerId });
  world.addComponent(c, 'tradeHome', { buildingId: home.id! });
  return c;
}

function route(world: EcsWorld, players: PlayerManager, c: Entity, target: Entity) {
  const check = checkTradeRoute(world, c, target, players);
  if (!check.ok) throw new Error(`route refused: ${check.reason}`);
  startTradeRoute(world, c, check, false);
  return check;
}

describe('TradeSystem (M17)', () => {
  afterEach(() => resetUiStore());

  it('a cart shuttles between two own markets and earns gold on every arrival, counted as gathered', () => {
    const { world, map, players, step } = setup();
    resetUiStore(uiStore, { food: 0, wood: 0, gold: 0 });
    const a = market(world, map, 2);
    const b = market(world, map, 62);
    const c = cart(world, a);
    const stats = new MatchStats(world, players, 0);
    const detach = stats.attach();
    const { gold } = route(world, players, c, b);
    expect(gold).toBe(Math.round(TRADE.goldPerTile * tradeDistance(a, b)));
    expect(gold).toBe(15);
    const ai = players.get(1)!;
    const before = ai.resources.gold;
    step(30_000);
    // First arrival at the target: paid once, heading home.
    expect(uiStore.getState().resources.gold).toBe(gold);
    expect(ai.resources.gold).toBe(before + gold);
    expect(c.tradeRoute?.toTarget).toBe(false);
    step(25_000);
    expect(uiStore.getState().resources.gold).toBe(2 * gold);
    expect(c.tradeRoute?.toTarget).toBe(true);
    expect(stats.of(1).gathered).toBe(2 * gold);
    detach();
  });

  it('the rate on a 60-tile route is about 0.6–0.8 gold per second per cart', () => {
    const { world, map, players, step } = setup();
    const a = market(world, map, 2);
    const b = market(world, map, 62);
    const c = cart(world, a);
    route(world, players, c, b);
    const ai = players.get(1)!;
    const start = ai.resources.gold;
    step(300_000);
    const perSec = (ai.resources.gold - start) / 300;
    expect(perSec).toBeGreaterThan(0.55);
    expect(perSec).toBeLessThan(0.85);
  });

  it("an ally's market pays the ally bonus; another team's is refused", () => {
    const { world, map, players } = setup(true);
    const a = market(world, map, 2);
    const ally = market(world, map, 62, 2);
    const enemy = market(world, map, 40, 3);
    const c = cart(world, a);
    const check = checkTradeRoute(world, c, ally, players);
    expect(check.ok && check.gold).toBe(Math.round(TRADE.goldPerTile * tradeDistance(a, ally) * (1 + TRADE.allyBonus)));
    expect(tradeGoldPerTrip(a, ally, 1, players, undefined)).toBe(19);
    expect(checkTradeRoute(world, c, enemy, players)).toEqual({ ok: false, reason: 'notFriendly' });
  });

  it('refuses a market closer than TRADE.minDistance, an unfinished one and the home itself', () => {
    const { world, map, players } = setup();
    const a = market(world, map, 2);
    const near = market(world, map, 2 + TRADE.minDistance - 2);
    const site = market(world, map, 50, 1, true);
    const c = cart(world, a);
    expect(checkTradeRoute(world, c, near, players)).toEqual({ ok: false, reason: 'tooClose' });
    expect(checkTradeRoute(world, c, site, players)).toEqual({ ok: false, reason: 'unfinished' });
    expect(checkTradeRoute(world, c, a, players)).toEqual({ ok: false, reason: 'sameAsHome' });
  });

  it('a cart whose target market is destroyed stops cleanly and stays idle (no loop, no crash)', () => {
    const { world, map, players, step } = setup();
    const a = market(world, map, 2);
    const b = market(world, map, 62);
    const c = cart(world, a);
    route(world, players, c, b);
    step(5_000);
    world.remove(b);
    step(200);
    expect(c.tradeRoute).toBeUndefined();
    expect(c.movable!.path).toEqual([]);
    const at = { ...c.position! };
    step(10_000);
    expect(c.position).toEqual(at);
    expect(players.get(1)!.resources.gold).toBe(100);
  });

  it('a dying (collapsing) home also ends the route', () => {
    const { world, map, players, step } = setup();
    const a = market(world, map, 2);
    const b = market(world, map, 62);
    const c = cart(world, a);
    route(world, players, c, b);
    step(1_000);
    world.addComponent(a, 'dying', { ttlMs: 2000 });
    step(200);
    expect(c.tradeRoute).toBeUndefined();
  });

  it("an ally's market whose owner is defeated stops the cart", () => {
    const { world, map, players, step } = setup(true);
    const a = market(world, map, 2);
    const b = market(world, map, 62, 2);
    const c = cart(world, a);
    route(world, players, c, b);
    step(1_000);
    players.get(2)!.defeated = true;
    step(200);
    expect(c.tradeRoute).toBeUndefined();
  });

  it('a converted cart loses its route and home; its first new order takes the nearest own market as home', () => {
    const { world, map, players, step } = setup();
    const a = market(world, map, 2);
    const b = market(world, map, 62);
    const enemyA = market(world, map, 30, 3);
    const enemyB = market(world, map, 2, 3);
    world.remove(enemyB);
    const c = cart(world, a);
    route(world, players, c, b);
    step(2_000);
    convertUnit(world, c, 3, () => 'english');
    expect(c.tradeRoute).toBeUndefined();
    expect(c.tradeHome).toBeUndefined();
    step(2_000);
    expect(c.tradeRoute).toBeUndefined();
    // Player 3 now owns it: a route to player 1's market is another team's, refused.
    expect(checkTradeRoute(world, c, b, players)).toEqual({ ok: false, reason: 'notFriendly' });
    const far = market(world, map, 62 - 4, 3);
    world.remove(b);
    const check = checkTradeRoute(world, c, far, players);
    expect(check.ok && check.home).toBe(enemyA);
  });

  it('a new order (a move) drops the route', () => {
    const { world, map, players, step } = setup();
    const a = market(world, map, 2);
    const b = market(world, map, 62);
    const c = cart(world, a);
    route(world, players, c, b);
    step(1_000);
    // OrderIssuer clears the old order first (clearUnitOrders); the AI does the same.
    clearUnitOrders(world, c);
    world.addComponent(c, 'moveIntent', { target: { tx: 10, ty: 2 } });
    step(1_000);
    expect(c.tradeRoute).toBeUndefined();
  });
});

describe('trader home and panel (M17)', () => {
  it('the market trains trade carts, and a cart remembers the market it was trained at', () => {
    const { world, map, players } = setup();
    const a = market(world, map, 2);
    expect(a.trainingQueue).toBeDefined();
    a.trainingQueue!.entries.push({ unitType: 'trade_cart', elapsed: 0, totalTime: 1 });
    new TrainingSystem(world, map, players).update(1_500);
    const c = world.entities.find((e) => e.unit?.unitType === 'trade_cart');
    expect(c?.tradeHome).toEqual({ buildingId: a.id });
  });

  it('the selection panel shows the route with its gold per leg', () => {
    const { world, map, players } = setup(true);
    const a = market(world, map, 2);
    const b = market(world, map, 62, 2);
    const c = cart(world, a);
    const sel = () => toSelectedInfo(c as SelectableWithPos, () => 'hungarian', () => false, (e) => tradeRouteView(world, e, players));
    expect(sel()).toMatchObject({ kind: 'unit', trader: true });
    expect(routeText(undefined)).toBe(hu.hud.noRoute);
    route(world, players, c, b);
    const info = sel();
    if (info?.kind !== 'unit' || !info.route) throw new Error('no route info');
    expect(info.route).toEqual({ home: 'market', target: 'market', ally: true, gold: 19 });
    expect(routeText(info.route)).toBe('Útvonal: Piac ↔ Piac (szövetséges), ~19 arany/út');
  });
});

describe('trade ship (M17)', () => {
  it('sails between two docks on the water, stopping beside each, and earns gold', () => {
    // Land on the west and east edges (x < 10, x ≥ 60), the sea between.
    const map = new MapData(70, 20, TERRAIN.grass);
    for (let ty = 0; ty < 20; ty++) for (let tx = 10; tx < 60; tx++) map.setTile(tx, ty, TERRAIN.water);
    const world = createEcsWorld();
    const players = new PlayerManager([createPlayer({ id: 1 })]);
    const west = createBuilding(world, { type: 'dock', origin: { tx: 7, ty: 8 }, playerId: 1, mapData: map });
    const east = createBuilding(world, { type: 'dock', origin: { tx: 60, ty: 8 }, playerId: 1, mapData: map });
    const ship = createUnit(world, { type: 'trade_ship', tile: { tx: 10, ty: 9 }, playerId: 1 });
    world.addComponent(ship, 'tradeHome', { buildingId: west.id! });
    // A cart may not trade with docks, nor a ship with markets.
    const check = checkTradeRoute(world, ship, east, players);
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    startTradeRoute(world, ship, check, false);
    const trade = new TradeSystem(world, map, players);
    const pathing = new PathfindingSystem(world, map);
    const movement = new MovementSystem(world, players, map);
    const p = players.get(1)!;
    const start = p.resources.gold;
    let arrived = false;
    for (let t = 0; t < 60_000; t += 100) {
      pathing.update();
      trade.update(100);
      movement.update(100);
      expect(map.getTile(ship.position!.tx, ship.position!.ty)).toBe(TERRAIN.water);
      if (!arrived && ship.tradeRoute?.toTarget === false) {
        arrived = true;
        // Beside the east dock's footprint, on the water.
        expect(ship.position!.tx).toBe(59);
      }
    }
    expect(arrived).toBe(true);
    expect(p.resources.gold).toBeGreaterThan(start + check.gold);
  });
});
