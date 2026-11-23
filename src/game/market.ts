import { MARKET } from '../config/balance';
import type { Entity } from '../ecs/components';
import type { Wallet } from '../ecs/research';
import type { Player } from './Player';

/** The resources a market buys and sells for gold (M17). */
export type MarketResource = 'food' | 'wood';
export const MARKET_RESOURCES: readonly MarketResource[] = ['food', 'wood'];

/**
 * A player's market terms beside the base MARKET table: `feeMul` scales the
 * sell fee, `stepMul` the price move per trade. Identity until a landmark
 * (the Italian Bankház, M17 Task 3) improves them.
 */
export interface MarketRates {
  readonly feeMul: number;
  readonly stepMul: number;
}

const IDENTITY_RATES: MarketRates = { feeMul: 1, stepMul: 1 };

/** The player's market terms (hook for M17 Task 3's Bankház; identity for now). */
export function marketRateMultiplier(_player: Player): MarketRates {
  return IDENTITY_RATES;
}

export interface MarketResult {
  readonly ok: boolean;
  readonly reason?: 'gold' | 'resource' | 'no-market';
}

/** One lot's buy and sell price for each market resource, in whole gold. */
export type MarketQuotes = Readonly<Record<MarketResource, { readonly buy: number; readonly sell: number }>>;

const clampPrice = (price: number): number => Math.min(MARKET.maxPrice, Math.max(MARKET.minPrice, price));

/** Gold one lot of `resource` costs the player now. */
export function buyPrice(player: Player, resource: MarketResource): number {
  return Math.round(player.marketPrices[resource]);
}

/** Gold the player receives for one lot of `resource` now (the price less the sell fee). */
export function sellPrice(player: Player, resource: MarketResource): number {
  const fee = Math.min(1, Math.max(0, MARKET.sellFee * marketRateMultiplier(player).feeMul));
  return Math.round(player.marketPrices[resource] * (1 - fee));
}

/** The player's current buy and sell prices (the market panel's labels). */
export function marketQuotes(player: Player): MarketQuotes {
  return {
    food: { buy: buyPrice(player, 'food'), sell: sellPrice(player, 'food') },
    wood: { buy: buyPrice(player, 'wood'), sell: sellPrice(player, 'wood') },
  };
}

/** Moves the player's price of `resource` up (dir 1) or down (dir -1) by one trade's step, clamped. */
function movePrice(player: Player, resource: MarketResource, dir: 1 | -1): void {
  const price = player.marketPrices[resource];
  const step = MARKET.step * marketRateMultiplier(player).stepMul;
  player.marketPrices = { ...player.marketPrices, [resource]: clampPrice(price * (1 + dir * step)) };
}

/**
 * Buys one lot (MARKET.lot) of `resource` for its current price from
 * `wallet` (the human's UI store wallet, an AI's Player): refused with
 * 'gold' when the wallet cannot pay. A buy raises that resource's price.
 */
export function marketBuy(player: Player, wallet: Wallet, resource: MarketResource): MarketResult {
  const have = wallet.get();
  const cost = buyPrice(player, resource);
  if (have.gold < cost) return { ok: false, reason: 'gold' };
  wallet.set({ ...have, gold: have.gold - cost, [resource]: have[resource] + MARKET.lot });
  movePrice(player, resource, 1);
  return { ok: true };
}

/**
 * Sells one lot of `resource` for its price less the fee: refused with
 * 'resource' when the wallet holds less than a lot. A sale lowers that
 * resource's price.
 */
export function marketSell(player: Player, wallet: Wallet, resource: MarketResource): MarketResult {
  const have = wallet.get();
  if (have[resource] < MARKET.lot) return { ok: false, reason: 'resource' };
  const gold = sellPrice(player, resource);
  wallet.set({ ...have, gold: have.gold + gold, [resource]: have[resource] - MARKET.lot });
  movePrice(player, resource, -1);
  return { ok: true };
}

/**
 * A trade asked for at `market` (the human's market panel, M17): only at
 * the player's own, finished, standing market; then a buy or a sale of one
 * lot through `wallet`. 'no-market' when the building cannot trade.
 */
export function tradeAtMarket(
  market: Entity | undefined,
  player: Player,
  wallet: Wallet,
  side: 'buy' | 'sell',
  resource: MarketResource,
): MarketResult {
  const ok = market?.building?.type === 'market' && market.owner?.playerId === player.id && !market.underConstruction && !market.dying;
  if (!ok) return { ok: false, reason: 'no-market' };
  return side === 'buy' ? marketBuy(player, wallet, resource) : marketSell(player, wallet, resource);
}
