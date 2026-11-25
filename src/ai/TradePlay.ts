import { MARKET, TRADE } from '../config/balance';
import type { TradeTuning } from '../config/aiMedium';
import type { Entity } from '../ecs/components';
import { playerWallet } from '../ecs/research';
import { isBuildingAvailable } from '../game/availability';
import { areAllies } from '../game/diplomacy';
import { isFortCiv } from '../game/landmarks';
import { MARKET_RESOURCES, tradeAtMarket, type MarketResource } from '../game/market';
import { checkTradeRoute, startTradeRoute, tradeDistance } from '../game/trade';
import { chebyshev, type TileCoord } from '../iso/coordinates';
import { FOG_UNEXPLORED } from '../map/FogOfWarData';
import type { BaseUnitType, BuildingType, Resources } from '../types';
import type { AIContext } from './AIPlayer';
import { landReachableFromAny } from './decisions/naval';
import { baseAnchor } from './economyBuildings';
import type { WorldView } from './perception';

/** The strategy helpers trade play acts through (BaseStrategy's building and training, the strategy's savings). */
export interface TradeActions {
  ownCount(view: WorldView, type: BuildingType, finishedOnly?: boolean): number;
  /** The age's military buildings are all standing (the market and landmark come after the army's production). */
  militaryReady(ctx: AIContext, view: WorldView): boolean;
  /** Places a site, paid only from what the strategy's savings leave over. */
  startBuilding(ctx: AIContext, view: WorldView, type: BuildingType, anchor: TileCoord): Entity | null;
  /** Queues a unit, paid only from what the strategy's savings leave over. */
  train(ctx: AIContext, view: WorldView, type: BaseUnitType, maxQueued?: number): boolean;
  /** What the strategy keeps saved now (a sale never takes a stock below it). */
  reserve(ctx: AIContext, view: WorldView): Resources;
  /** Whether the next age-up or a unit of the army mix needs more gold than the AI holds. */
  goldShort(ctx: AIContext, view: WorldView): boolean;
}

/** How far toward the enemy a fort landmark's placement anchor is moved from the base centre (tiles). */
const FORT_LEAN = 5;

/**
 * Trade play of the Medium strategy family (CLAUDE.md M17 "AI
 * (Közepestől)"). Read from the world each time, apart from the time of
 * the last sale (saved with the strategy):
 *  - build: from age 2 with `minVillagers` and the age's military
 *    buildings standing, one market, then the nation's landmark (a fort
 *    leans toward the nearest known enemy);
 *  - sell: at the own finished market, at most once per `sellEveryMs`, one
 *    lot of the larger food / wood stock above `sellAbove` while gold is
 *    below `sellWhenGoldBelow` and needed. It never buys: the AI's gatherer
 *    split already follows what it lacks, and buying gold-for-food would
 *    only feed the army's spending loop;
 *  - train / control: up to `carts` trade carts, only toward an ally's
 *    market (a team match) TRADE.minDistance away and on the same land;
 *    each idle cart is routed (checkTradeRoute → startTradeRoute) to the
 *    ally market paying most. Trade ships are left for later.
 */
export class TradePlay {
  /** Game time of the last market sale (-Infinity: none yet). */
  private lastSellMs = -Infinity;

  constructor(
    private readonly tune: TradeTuning,
    private readonly act: TradeActions,
  ) {}

  /** The last sale's time, or undefined before the first (saved only when set). */
  snapshot(): number | undefined {
    return Number.isFinite(this.lastSellMs) ? this.lastSellMs : undefined;
  }

  restore(lastSellMs: number | undefined): void {
    this.lastSellMs = lastSellMs ?? -Infinity;
  }

  build(ctx: AIContext, view: WorldView): void {
    if (!this.tune.market && !this.tune.landmark) return;
    if (!isBuildingAvailable('market', ctx.player.age) || view.villagers.length < this.tune.minVillagers) return;
    if (!this.act.militaryReady(ctx, view)) return;
    const anchor = baseAnchor(view);
    if (!anchor) return;
    if (this.tune.market && this.act.ownCount(view, 'market') === 0) {
      this.act.startBuilding(ctx, view, 'market', anchor);
      return;
    }
    // startBuilding's buildBlocker refuses a second landmark (UNIQUE_BUILDINGS).
    if (this.tune.landmark && this.act.ownCount(view, 'landmark') === 0) {
      this.act.startBuilding(ctx, view, 'landmark', isFortCiv(ctx.player.civ) ? fortAnchor(view, anchor) : anchor);
    }
  }

  sell(ctx: AIContext, view: WorldView): void {
    if (ctx.timeMs - this.lastSellMs < this.tune.sellEveryMs) return;
    const market = ownMarket(view);
    const r = ctx.player.resources;
    if (!market || r.gold >= this.tune.sellWhenGoldBelow) return;
    const keep = this.act.reserve(ctx, view);
    const sellable = (res: MarketResource) => r[res] > this.tune.sellAbove && r[res] - MARKET.lot >= keep[res];
    const res = MARKET_RESOURCES.filter(sellable).sort((a, b) => r[b] - r[a])[0];
    if (!res || !this.act.goldShort(ctx, view)) return;
    if (tradeAtMarket(market, ctx.player, playerWallet(ctx.player), 'sell', res).ok) this.lastSellMs = ctx.timeMs;
  }

  train(ctx: AIContext, view: WorldView): void {
    if (this.tune.carts <= 0) return;
    const home = ownMarket(view);
    if (!home?.position) return;
    const queued = view.buildings.reduce((n, b) => n + (b.trainingQueue?.entries.filter((e) => e.unitType === 'trade_cart').length ?? 0), 0);
    if (TradePlay.cartsOf(ctx).length + queued >= this.tune.carts) return;
    const partners = allyMarkets(ctx).filter((m) => tradeDistance(home, m) >= TRADE.minDistance);
    // One flood from the home market: a partner on another island is never a destination.
    if (partners.length === 0 || !landReachableFromAny(ctx.mapData, partners.map((m) => m.position!), home.position)) return;
    this.act.train(ctx, view, 'trade_cart', 1);
  }

  /** Routes each idle cart to the reachable ally market that pays most per leg. */
  control(ctx: AIContext, _view: WorldView): void {
    const idle = TradePlay.cartsOf(ctx).filter((c) => !c.tradeRoute && !c.moveIntent && (c.movable?.path.length ?? 0) === 0);
    if (idle.length === 0) return;
    const partners = allyMarkets(ctx);
    if (partners.length === 0) return;
    const teams = ctx.teams;
    if (!teams) return;
    for (const cart of idle) {
      let best: Extract<ReturnType<typeof checkTradeRoute>, { ok: true }> | null = null;
      for (const m of partners) {
        const check = checkTradeRoute(ctx.world, cart, m, teams, ctx.mapData, ctx.player);
        if (check.ok && (!best || check.gold > best.gold)) best = check;
      }
      if (best) startTradeRoute(ctx.world, cart, best);
    }
  }

  /** The AI's own living trade carts. */
  static cartsOf(ctx: AIContext): Entity[] {
    return ctx.world.entities.filter(
      (e) => e.unit?.unitType === 'trade_cart' && e.owner?.playerId === ctx.player.id && !e.dying && e.position,
    );
  }
}

/** The AI's own finished market (the first). */
function ownMarket(view: WorldView): Entity | undefined {
  return view.buildings.find((b) => b.building?.type === 'market' && !b.underConstruction);
}

/**
 * Allies' finished, standing markets on explored ground (allies share
 * sight, M16), whose owner is still in the match. None without teams.
 */
function allyMarkets(ctx: AIContext): Entity[] {
  const teams = ctx.teams;
  if (!teams) return [];
  const me = ctx.player.id;
  const out: Entity[] = [];
  for (const b of ctx.world.with('building', 'owner', 'position')) {
    if (b.building.type !== 'market' || b.underConstruction || b.dying || b.owner.playerId === me) continue;
    if (!areAllies(teams, me, b.owner.playerId) || ctx.isDefeated?.(b.owner.playerId) === true) continue;
    if (ctx.fog.get(b.position.tx, b.position.ty) === FOG_UNEXPLORED) continue;
    out.push(b);
  }
  return out;
}

/** The base centre moved FORT_LEAN tiles toward the nearest known enemy building (else the base centre). */
function fortAnchor(view: WorldView, anchor: TileCoord): TileCoord {
  const enemy = view.knownEnemyBuildings.reduce<TileCoord | undefined>(
    (best, b) => (!best || chebyshev(b.position, anchor) < chebyshev(best, anchor) ? b.position : best),
    undefined,
  );
  if (!enemy) return anchor;
  const dx = enemy.tx - anchor.tx;
  const dy = enemy.ty - anchor.ty;
  const len = Math.hypot(dx, dy);
  if (len === 0) return anchor;
  return { tx: Math.round(anchor.tx + (dx / len) * FORT_LEAN), ty: Math.round(anchor.ty + (dy / len) * FORT_LEAN) };
}
