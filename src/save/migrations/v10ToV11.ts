import { MARKET } from '../../config/balance';
import type { Migration } from './index';

/**
 * v10 (M16) → v11 (M17): the building enum gains the market (a v10 save
 * has none, nor a landmark), and every player gains market prices and a
 * landmark carry; a v10 player never traded, so each gets MARKET.startPrice,
 * and owns no landmark, so its carry is 0. Players that are not objects are
 * left for the schema to reject.
 */
export const v10ToV11: Migration = (data) => {
  const players = data['players'];
  if (!Array.isArray(players)) return data;
  return {
    ...data,
    players: players.map((p: unknown) =>
      typeof p === 'object' && p !== null && !Array.isArray(p) ? { ...p, marketPrices: { ...MARKET.startPrice }, landmarkCarry: 0 } : p,
    ),
  };
};
