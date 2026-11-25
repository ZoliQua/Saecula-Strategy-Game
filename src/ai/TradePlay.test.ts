import { describe, expect, it } from 'vitest';
import { AI_MEDIUM, type TradeTuning } from '../config/aiBalance';
import { MARKET } from '../config/balance';
import { createBuilding } from '../ecs/archetypes/building';
import { createUnit } from '../ecs/archetypes/createUnit';
import type { Entity } from '../ecs/components';
import { createEcsWorld } from '../ecs/world';
import type { TeamLookup } from '../game/diplomacy';
import { createPlayer, type Player } from '../game/Player';
import { FogOfWarData } from '../map/FogOfWarData';
import { MapData } from '../map/MapData';
import type { BaseUnitType, BuildingType, CivId, Resources } from '../types';
import type { AIContext } from './AIPlayer';
import { Perception } from './perception';
import { TradePlay, type TradeActions } from './TradePlay';

const SIZE = 60;
/** Players 1 and 2 are allies (team 1); 3 is the enemy. */
const TEAMS: TeamLookup = { teamOf: (id) => (id <= 2 ? 1 : 2), hasTeams: () => true };

interface Calls {
  built: { type: BuildingType; anchor: { tx: number; ty: number } }[];
  trained: BaseUnitType[];
}

function scene(opts: { civ?: CivId; tune?: Partial<TradeTuning>; goldShort?: boolean; reserve?: Resources; ready?: boolean } = {}) {
  const map = new MapData(SIZE, SIZE);
  const world = createEcsWorld();
  const fog = new FogOfWarData(SIZE, SIZE);
  for (let ty = 0; ty < SIZE; ty++) for (let tx = 0; tx < SIZE; tx++) fog.markVisible(tx, ty);
  createBuilding(world, { type: 'town_center', origin: { tx: 5, ty: 5 }, playerId: 2, mapData: map });
  const player: Player = createPlayer({ id: 2, civ: opts.civ ?? 'english', age: 2 });
  const calls: Calls = { built: [], trained: [] };
  const own = (view: { buildings: readonly Entity[] }, t: BuildingType) => view.buildings.filter((b) => b.building?.type === t).length;
  const act: TradeActions = {
    ownCount: (v, t) => own(v, t),
    militaryReady: () => opts.ready ?? true,
    startBuilding: (_c, _v, type, anchor) => {
      calls.built.push({ type, anchor });
      return null;
    },
    train: (_c, _v, type) => {
      calls.trained.push(type);
      return true;
    },
    reserve: () => opts.reserve ?? { food: 0, wood: 0, gold: 0 },
    goldShort: () => opts.goldShort ?? true,
  };
  const play = new TradePlay({ ...AI_MEDIUM.trade, minVillagers: 0, ...opts.tune }, act);
  const perception = new Perception();
  const ctx = (timeMs: number): AIContext => ({ world, mapData: map, player, timeMs, fog, teams: TEAMS });
  const view = (t: number) => perception.update(ctx(t));
  return { world, map, player, play, calls, ctx, view };
}

const market = (s: ReturnType<typeof scene>, playerId: number, tx: number, ty: number, underConstruction = false) =>
  createBuilding(s.world, { type: 'market', origin: { tx, ty }, playerId, mapData: s.map, underConstruction });

describe('TradePlay.build', () => {
  it('builds nothing before age 2 or before the military buildings stand', () => {
    const s = scene({ ready: false });
    s.play.build(s.ctx(0), s.view(0));
    const t = scene();
    t.player.age = 1;
    t.play.build(t.ctx(0), t.view(0));
    expect([...s.calls.built, ...t.calls.built]).toEqual([]);
  });

  it('builds a market first, then the landmark', () => {
    const s = scene();
    s.play.build(s.ctx(0), s.view(0));
    expect(s.calls.built.map((b) => b.type)).toEqual(['market']);
    market(s, 2, 15, 5, true);
    s.play.build(s.ctx(1), s.view(1));
    expect(s.calls.built.map((b) => b.type)).toEqual(['market', 'landmark']);
    createBuilding(s.world, { type: 'landmark', origin: { tx: 5, ty: 15 }, playerId: 2, mapData: s.map, underConstruction: true });
    s.play.build(s.ctx(2), s.view(2));
    expect(s.calls.built).toHaveLength(2);
  });

  it('leans a fort landmark toward the nearest known enemy building; other landmarks go at the base centre', () => {
    for (const [civ, lean] of [['hungarian', true], ['english', false]] as const) {
      const s = scene({ civ });
      market(s, 2, 15, 5);
      createBuilding(s.world, { type: 'house', origin: { tx: 40, ty: 6 }, playerId: 3, mapData: s.map });
      s.play.build(s.ctx(0), s.view(0));
      const anchor = s.calls.built[0]!.anchor;
      expect(anchor.tx > 6).toBe(lean);
      expect(anchor.ty).toBe(6);
    }
  });

  it('honours the tuning switches', () => {
    const s = scene({ tune: { market: false, landmark: false } });
    s.play.build(s.ctx(0), s.view(0));
    expect(s.calls.built).toEqual([]);
  });
});

describe('TradePlay.sell', () => {
  it('sells one lot of the larger stock above sellAbove while gold is low and needed, at most once per sellEveryMs', () => {
    const s = scene();
    market(s, 2, 15, 5);
    s.player.resources = { food: 1300, wood: 1100, gold: 50 };
    s.play.sell(s.ctx(1000), s.view(1000));
    expect(s.player.resources.food).toBe(1300 - MARKET.lot);
    expect(s.player.resources.gold).toBe(50 + Math.round(MARKET.startPrice.food * (1 - MARKET.sellFee)));
    expect(s.player.marketPrices.food).toBeLessThan(MARKET.startPrice.food);
    s.play.sell(s.ctx(1000 + AI_MEDIUM.trade.sellEveryMs - 1), s.view(2000));
    expect(s.player.resources.food).toBe(1200);
    s.play.sell(s.ctx(1000 + AI_MEDIUM.trade.sellEveryMs), s.view(3000));
    expect(s.player.resources.food).toBe(1100);
    expect(s.play.snapshot()).toBe(1000 + AI_MEDIUM.trade.sellEveryMs);
  });

  it('never sells with enough gold, without a need for gold, without a finished market, or below the reserve', () => {
    const cases = [
      { setup: (s: ReturnType<typeof scene>) => { market(s, 2, 15, 5); s.player.resources = { food: 1500, wood: 0, gold: 500 }; } },
      { goldShort: false, setup: (s: ReturnType<typeof scene>) => { market(s, 2, 15, 5); s.player.resources = { food: 1500, wood: 0, gold: 0 }; } },
      { setup: (s: ReturnType<typeof scene>) => { market(s, 2, 15, 5, true); s.player.resources = { food: 1500, wood: 0, gold: 0 }; } },
      { setup: (s: ReturnType<typeof scene>) => { market(s, 2, 15, 5); s.player.resources = { food: 900, wood: 1000, gold: 0 }; } },
      {
        reserve: { food: 1450, wood: 0, gold: 0 },
        setup: (s: ReturnType<typeof scene>) => { market(s, 2, 15, 5); s.player.resources = { food: 1500, wood: 0, gold: 0 }; },
      },
    ];
    for (const c of cases) {
      const s = scene({ ...(c.goldShort !== undefined ? { goldShort: c.goldShort } : {}), ...(c.reserve ? { reserve: c.reserve } : {}) });
      c.setup(s);
      const before = { ...s.player.resources };
      s.play.sell(s.ctx(0), s.view(0));
      expect(s.player.resources).toEqual(before);
    }
  });

  it('keeps the last sale across a snapshot and restore', () => {
    const s = scene();
    market(s, 2, 15, 5);
    s.player.resources = { food: 1500, wood: 0, gold: 0 };
    s.play.restore(5000);
    s.play.sell(s.ctx(6000), s.view(6000));
    expect(s.player.resources.food).toBe(1500);
    s.play.restore(undefined);
    expect(s.play.snapshot()).toBeUndefined();
    s.play.sell(s.ctx(6000), s.view(6000));
    expect(s.player.resources.food).toBe(1400);
  });
});

describe('TradePlay carts', () => {
  it('trains carts only toward an ally market far enough away, up to `carts`', () => {
    const none = scene();
    market(none, 2, 15, 5);
    none.play.train(none.ctx(0), none.view(0));
    // An enemy's market never counts, nor an ally's that is too close.
    market(none, 3, 15, 40);
    market(none, 1, 22, 5);
    none.play.train(none.ctx(1), none.view(1));
    expect(none.calls.trained).toEqual([]);

    const s = scene();
    market(s, 2, 15, 5);
    market(s, 1, 15, 40);
    s.play.train(s.ctx(0), s.view(0));
    expect(s.calls.trained).toEqual(['trade_cart']);
    for (let i = 0; i < AI_MEDIUM.trade.carts; i++) createUnit(s.world, { type: 'trade_cart', tile: { tx: 14, ty: 9 + i }, playerId: 2 });
    s.play.train(s.ctx(1), s.view(1));
    expect(s.calls.trained).toHaveLength(1);
  });

  it('routes an idle cart to the ally market, never to an enemy one', () => {
    const s = scene();
    const home = market(s, 2, 15, 5);
    market(s, 3, 50, 50);
    const ally = market(s, 1, 15, 40);
    const cart = createUnit(s.world, { type: 'trade_cart', tile: { tx: 14, ty: 9 }, playerId: 2 });
    s.world.addComponent(cart, 'tradeHome', { buildingId: home.id! });
    s.play.control(s.ctx(0), s.view(0));
    expect(cart.tradeRoute).toMatchObject({ homeId: home.id, targetId: ally.id });
  });

  it('leaves a cart alone without an ally market', () => {
    const s = scene();
    market(s, 2, 15, 5);
    market(s, 3, 15, 40);
    const cart = createUnit(s.world, { type: 'trade_cart', tile: { tx: 14, ty: 9 }, playerId: 2 });
    s.play.control(s.ctx(0), s.view(0));
    expect(cart.tradeRoute).toBeUndefined();
  });
});
