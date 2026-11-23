import { TRADE } from '../config/balance';
import type { Entity } from '../ecs/components';
import type { EcsWorld } from '../ecs/world';
import type { BuildingType, UnitType } from '../types';
import { areAllies, type TeamLookup } from './diplomacy';
import type { Player } from './Player';

/*
 * Trade rules (M17, CLAUDE.md §9 "Kereskedőkocsi", "Kereskedőhajó"): which
 * units trade, between which buildings, and what an arrival pays. The
 * TradeSystem drives the shuttle; the human's orders and the cursor ask
 * `checkTradeRoute` before a route is set.
 */

/** The building a trader shuttles between: a market for the cart, a dock for the ship; null for any other unit. */
export function tradePostType(type: UnitType): BuildingType | null {
  if (type === 'trade_cart') return 'market';
  if (type === 'trade_ship') return 'dock';
  return null;
}

/** Whether `e` is a living trader (a trade cart or trade ship). */
export function isTrader(e: Entity): boolean {
  return !!e.unit && tradePostType(e.unit.unitType) !== null && !e.dying;
}

/** A building entity by id (traders keep ids of their home and target), or undefined when it is gone. */
export function buildingById(world: EcsWorld, id: number): Entity | undefined {
  for (const b of world.with('building')) if (b.id === id) return b;
  return undefined;
}

/** The centre tile of a building's footprint (fractional for even sizes). */
function centre(b: Entity): { x: number; y: number } {
  const p = b.position ?? { tx: 0, ty: 0 };
  const f = b.building?.footprint ?? { width: 1, height: 1 };
  return { x: p.tx + (f.width - 1) / 2, y: p.ty + (f.height - 1) / 2 };
}

/** Route length in tiles: the Euclidean distance between the two buildings' centre tiles. */
export function tradeDistance(a: Entity, b: Entity): number {
  const ca = centre(a);
  const cb = centre(b);
  return Math.hypot(ca.x - cb.x, ca.y - cb.y);
}

/**
 * The player's trade income multiplier (hook for M17 Task 3's Hanseatic
 * kontor, +25 %); identity for now.
 */
export function tradeGoldMultiplier(_player: Player | undefined): number {
  return 1;
}

/**
 * Gold one arrival pays `ownerId` on the route home ↔ target (TRADE):
 * goldPerTile × distance, more toward an ally's building (allyBonus),
 * times tradeGoldMultiplier, rounded.
 */
export function tradeGoldPerTrip(home: Entity, target: Entity, ownerId: number, teams: TeamLookup, player: Player | undefined): number {
  const ally = target.owner !== undefined && areAllies(teams, ownerId, target.owner.playerId);
  return Math.round(TRADE.goldPerTile * tradeDistance(home, target) * (ally ? 1 + TRADE.allyBonus : 1) * tradeGoldMultiplier(player));
}

/** A finished, standing building of `type` owned by `ownerId` or an ally of it. */
function usablePost(b: Entity | undefined, type: BuildingType, ownerId: number, teams: TeamLookup): b is Entity {
  if (!b || b.building?.type !== type || b.dying || b.underConstruction || !b.owner) return false;
  return b.owner.playerId === ownerId || areAllies(teams, ownerId, b.owner.playerId);
}

/**
 * Whether the route's ends still hold (TradeSystem each tick): both standing
 * and finished, home own, target own or a (not defeated) ally's.
 */
export function routeStillValid(
  world: EcsWorld,
  trader: Entity,
  route: { homeId: number; targetId: number },
  teams: TeamLookup,
  isDefeated: (playerId: number) => boolean = () => false,
): boolean {
  const ownerId = trader.owner?.playerId;
  const type = trader.unit ? tradePostType(trader.unit.unitType) : null;
  if (ownerId === undefined || !type) return false;
  const home = buildingById(world, route.homeId);
  const target = buildingById(world, route.targetId);
  return (
    usablePost(home, type, ownerId, teams) &&
    home.owner?.playerId === ownerId &&
    usablePost(target, type, ownerId, teams) &&
    !isDefeated(target.owner?.playerId ?? 0)
  );
}

export type TradeRefusal = 'wrongKind' | 'notFriendly' | 'unfinished' | 'sameAsHome' | 'tooClose' | 'noHome';

export type TradeCheck =
  | { readonly ok: true; readonly home: Entity; readonly target: Entity; readonly gold: number }
  | { readonly ok: false; readonly reason: TradeRefusal };

/** The trader's own nearest finished, standing post (its home when it has none: a converted cart). */
function nearestOwnPost(world: EcsWorld, trader: Entity, type: BuildingType, exclude: Entity): Entity | undefined {
  const ownerId = trader.owner?.playerId;
  const at = trader.position;
  if (ownerId === undefined || !at) return undefined;
  let best: Entity | undefined;
  let bestD = Infinity;
  for (const b of world.with('building', 'owner', 'position')) {
    if (b === exclude || b.owner.playerId !== ownerId || b.building.type !== type || b.dying || b.underConstruction) continue;
    const c = centre(b);
    const d = Math.hypot(c.x - at.tx, c.y - at.ty);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

/**
 * Whether `trader` may trade with `target` (a route order, M17): the target
 * must be a market (cart) / dock (ship), its owner's or an ally's (never
 * another team's: no trade with a non-ally, treaty or not), finished, not
 * the trader's home, and at least TRADE.minDistance tiles from the home.
 * The home is the building the trader was trained at; when that is gone
 * (or the trader never had one: a converted cart) the trader's own nearest
 * finished market / dock other than the target is taken. `gold` is what
 * one arrival would pay.
 */
export function checkTradeRoute(world: EcsWorld, trader: Entity, target: Entity, teams: TeamLookup, player?: Player): TradeCheck {
  const type = trader.unit ? tradePostType(trader.unit.unitType) : null;
  const ownerId = trader.owner?.playerId;
  if (!type || ownerId === undefined || target.building?.type !== type || target.dying) return { ok: false, reason: 'wrongKind' };
  const targetOwner = target.owner?.playerId;
  if (targetOwner === undefined || (targetOwner !== ownerId && !areAllies(teams, ownerId, targetOwner))) return { ok: false, reason: 'notFriendly' };
  if (target.underConstruction) return { ok: false, reason: 'unfinished' };
  const saved = trader.tradeHome ? buildingById(world, trader.tradeHome.buildingId) : undefined;
  const savedOk = saved && saved.owner?.playerId === ownerId && saved.building?.type === type && !saved.dying && !saved.underConstruction;
  if (savedOk && saved === target) return { ok: false, reason: 'sameAsHome' };
  const home = savedOk ? saved : nearestOwnPost(world, trader, type, target);
  if (!home) return { ok: false, reason: 'noHome' };
  if (tradeDistance(home, target) < TRADE.minDistance) return { ok: false, reason: 'tooClose' };
  return { ok: true, home, target, gold: tradeGoldPerTrip(home, target, ownerId, teams, player) };
}

/**
 * Sets `trader` on the route of a passed check: home is remembered
 * (tradeHome), and it heads to the target first, unless it already stands
 * at the target (then home first, so a repeated order never pays twice in place).
 */
export function startTradeRoute(world: EcsWorld, trader: Entity, check: Extract<TradeCheck, { ok: true }>, atTarget: boolean): void {
  const homeId = check.home.id ?? -1;
  const targetId = check.target.id ?? -1;
  if (trader.tradeHome) trader.tradeHome.buildingId = homeId;
  else world.addComponent(trader, 'tradeHome', { buildingId: homeId });
  if (trader.tradeRoute) world.removeComponent(trader, 'tradeRoute');
  world.addComponent(trader, 'tradeRoute', { homeId, targetId, toTarget: !atTarget });
}

/**
 * What the selection panel shows of a trader's route (M17): the two ends'
 * building types, whether the target is an ally's, and the gold one leg pays.
 * Undefined without a route or when an end is gone.
 */
export function tradeRouteView(
  world: EcsWorld,
  trader: Entity,
  players: TeamLookup & { get(id: number): Player | undefined },
): { home: BuildingType; target: BuildingType; ally: boolean; gold: number } | undefined {
  const route = trader.tradeRoute;
  const ownerId = trader.owner?.playerId;
  if (!route || ownerId === undefined) return undefined;
  const home = buildingById(world, route.homeId);
  const target = buildingById(world, route.targetId);
  if (!home?.building || !target?.building) return undefined;
  const ally = target.owner !== undefined && areAllies(players, ownerId, target.owner.playerId);
  return { home: home.building.type, target: target.building.type, ally, gold: tradeGoldPerTrip(home, target, ownerId, players, players.get(ownerId)) };
}
