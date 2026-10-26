import { describe, expect, it } from 'vitest';
import { canAfford, scaleCost } from './economy';

describe('AI economy', () => {
  it('keeps savings only on the resources a cost spends', () => {
    const have = { food: 500, wood: 300, gold: 100 };
    const reserve = { food: 400, wood: 0, gold: 250 };
    // Pikeman: food + wood, no gold — the short gold savings do not block it.
    expect(canAfford(have, { food: 35, wood: 25, gold: 0 }, reserve)).toBe(true);
    // Knight spends gold below the savings line.
    expect(canAfford(have, { food: 60, wood: 0, gold: 75 }, reserve)).toBe(false);
    // Would dip food under its reserve.
    expect(canAfford(have, { food: 150, wood: 0, gold: 0 }, reserve)).toBe(false);
    expect(canAfford(have, { food: 600, wood: 0, gold: 0 })).toBe(false);
    expect(scaleCost({ food: 800, wood: 0, gold: 500 }, 0.5)).toEqual({ food: 400, wood: 0, gold: 250 });
  });
});
