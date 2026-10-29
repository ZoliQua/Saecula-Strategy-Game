import { describe, expect, it } from 'vitest';
import { formatStat, grouped, hex, playerColorCss } from './format';

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

describe('grouped and hex (shared by the score panel, the statistics screen and the civ cards)', () => {
  it('groups thousands with a thin space, rounding first', () => {
    expect([grouped(5), grouped(12345), grouped(1234567), grouped(999.6)]).toEqual(['5', '12\u202f345', '1\u202f234\u202f567', '1\u202f000']);
  });

  it('gives a 0xRRGGBB colour as a zero-padded CSS hex colour', () => {
    expect([hex(0x4a8ad0), hex(0x0000ff)]).toEqual(['#4a8ad0', '#0000ff']);
  });
});
