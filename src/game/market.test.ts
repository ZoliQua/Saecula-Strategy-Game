import { afterEach, describe, expect, it } from 'vitest';
import { MARKET } from '../config/balance';
import { playerWallet, uiWallet } from '../ecs/research';
import { resetUiStore, uiStore } from '../ui/store';
import type { Entity } from '../ecs/components';
import { buyPrice, marketBuy, marketQuotes, marketRateMultiplier, marketSell, sellPrice, tradeAtMarket } from './market';
import { createPlayer } from './Player';

const player = (resources = { food: 1000, wood: 1000, gold: 1000 }) => createPlayer({ id: 2, resources });

describe('market exchange (M17)', () => {
  afterEach(() => resetUiStore());

  it('starts at MARKET.startPrice; a sale pays the price less the fee', () => {
    const p = player();
    expect(p.marketPrices).toEqual(MARKET.startPrice);
    expect(buyPrice(p, 'food')).toBe(100);
    expect(sellPrice(p, 'wood')).toBe(70);
    expect(marketQuotes(p)).toEqual({ food: { buy: 100, sell: 70 }, wood: { buy: 100, sell: 70 } });
    expect(marketRateMultiplier(p)).toEqual({ feeMul: 1, stepMul: 1 });
  });

  it('a buy pays the price for a lot and raises that price by one step', () => {
    const p = player();
    const w = playerWallet(p);
    expect(marketBuy(p, w, 'food')).toEqual({ ok: true });
    expect(p.resources).toEqual({ food: 1100, wood: 1000, gold: 900 });
    expect(p.marketPrices.food).toBeCloseTo(103);
    expect(p.marketPrices.wood).toBe(100);
    expect(marketBuy(p, w, 'food').ok).toBe(true);
    expect(p.resources.gold).toBe(900 - 103);
    expect(p.marketPrices.food).toBeCloseTo(103 * 1.03);
  });

  it('a sale takes a lot, pays the fee-reduced price and lowers that price by one step', () => {
    const p = player();
    const w = playerWallet(p);
    expect(marketSell(p, w, 'wood')).toEqual({ ok: true });
    expect(p.resources).toEqual({ food: 1000, wood: 900, gold: 1070 });
    expect(p.marketPrices.wood).toBeCloseTo(97);
    expect(p.marketPrices.food).toBe(100);
  });

  it('refuses a buy without enough gold and a sale without a full lot, changing nothing', () => {
    const p = player({ food: 99, wood: 100, gold: 99 });
    const w = playerWallet(p);
    expect(marketBuy(p, w, 'wood')).toEqual({ ok: false, reason: 'gold' });
    expect(marketSell(p, w, 'food')).toEqual({ ok: false, reason: 'resource' });
    expect(p.resources).toEqual({ food: 99, wood: 100, gold: 99 });
    expect(p.marketPrices).toEqual(MARKET.startPrice);
    expect(marketSell(p, w, 'wood').ok).toBe(true);
  });

  it('prices never leave [minPrice, maxPrice] after many trades', () => {
    const p = player({ food: 1e9, wood: 1e9, gold: 1e9 });
    const w = playerWallet(p);
    for (let i = 0; i < 500; i++) marketBuy(p, w, 'food');
    expect(p.marketPrices.food).toBe(MARKET.maxPrice);
    for (let i = 0; i < 500; i++) marketSell(p, w, 'wood');
    expect(p.marketPrices.wood).toBe(MARKET.minPrice);
    for (let i = 0; i < 2000; i++) {
      if (i % 3 === 0) marketSell(p, w, 'food');
      else marketBuy(p, w, 'wood');
      for (const r of ['food', 'wood'] as const) {
        expect(p.marketPrices[r]).toBeGreaterThanOrEqual(MARKET.minPrice);
        expect(p.marketPrices[r]).toBeLessThanOrEqual(MARKET.maxPrice);
      }
    }
  });

  it("the human trades from the UI store wallet: no buy with too little gold there, whatever the Player holds", () => {
    const human = createPlayer({ id: 1, isHuman: true, resources: { food: 0, wood: 0, gold: 5000 } });
    resetUiStore(uiStore, { food: 0, wood: 0, gold: 50 });
    expect(marketBuy(human, uiWallet(), 'food')).toEqual({ ok: false, reason: 'gold' });
    expect(uiStore.getState().resources).toEqual({ food: 0, wood: 0, gold: 50 });
    uiStore.getState().setResources({ gold: 120 });
    expect(marketBuy(human, uiWallet(), 'food').ok).toBe(true);
    expect(uiStore.getState().resources).toEqual({ food: 100, wood: 0, gold: 20 });
    expect(human.resources.gold).toBe(5000);
  });
});

describe('tradeAtMarket (M17)', () => {
  const market = (over: Partial<Entity> = {}): Entity => ({
    id: 7,
    building: { type: 'market', footprint: { width: 3, height: 3 } },
    owner: { playerId: 2 },
    ...over,
  });

  it('trades only at the player’s own finished, standing market', () => {
    const p = player();
    const w = playerWallet(p);
    expect(tradeAtMarket(market(), p, w, 'buy', 'wood')).toEqual({ ok: true });
    expect(tradeAtMarket(market(), p, w, 'sell', 'food')).toEqual({ ok: true });
    expect(p.resources).toEqual({ food: 900, wood: 1100, gold: 970 });
    const refused = [
      undefined,
      market({ owner: { playerId: 3 } }),
      market({ underConstruction: { totalTime: 50, elapsed: 10 } }),
      market({ dying: { ttlMs: 100 } }),
      market({ building: { type: 'monastery', footprint: { width: 3, height: 3 } } }),
    ];
    for (const m of refused) expect(tradeAtMarket(m, p, w, 'buy', 'food')).toEqual({ ok: false, reason: 'no-market' });
    expect(p.resources).toEqual({ food: 900, wood: 1100, gold: 970 });
  });
});
