import { describe, expect, it } from 'vitest';
import { canTrade, tradeLabel } from './MarketPanel';

const quotes = { food: { buy: 112, sell: 70 }, wood: { buy: 100, sell: 63 } };

describe('market panel (M17)', () => {
  it('labels each button with the lot and the current price', () => {
    expect(tradeLabel('buy', 'food', quotes)).toBe('Vétel 100 étel — 112 arany');
    expect(tradeLabel('sell', 'wood', quotes)).toBe('Eladás 100 fa — 63 arany');
  });

  it('a buy needs the gold, a sale a full lot', () => {
    const have = { food: 99, wood: 100, gold: 111 };
    expect(canTrade('buy', 'food', quotes, have)).toBe(false);
    expect(canTrade('buy', 'wood', quotes, have)).toBe(true);
    expect(canTrade('sell', 'food', quotes, have)).toBe(false);
    expect(canTrade('sell', 'wood', quotes, have)).toBe(true);
  });
});
