import { describe, expect, it } from 'vitest';
import { formatStat, playerColorCss } from './format';

describe('formatStat', () => {
  it('rounds float noise to one decimal with a Hungarian decimal comma', () => {
    expect(formatStat(2.6399999999999997)).toBe('2,6');
    expect(formatStat(1.05)).toBe('1,1');
  });

  it('prints whole numbers without decimals', () => {
    expect(formatStat(5)).toBe('5');
    expect(formatStat(2.999)).toBe('3');
  });
});

describe('playerColorCss', () => {
  it('gives the player colour as a CSS hex colour', () => {
    expect(playerColorCss(1)).toBe('#4a8ad0');
    expect(playerColorCss(2)).toBe('#d04a4a');
  });

  it('wraps past the palette and falls back for Gaia', () => {
    expect(playerColorCss(7)).toBe('#4a8ad0');
    expect(playerColorCss(0)).toBe('#ffffff');
  });
});
