import { describe, expect, it } from 'vitest';
import { gameDelta } from './gameClock';

describe('gameDelta', () => {
  it('speed 1 with no dev scale is the real delta, unchanged', () => {
    expect(gameDelta(16.7, 1, 1)).toBe(16.7);
  });
  it('scales by the chosen speed', () => {
    expect(gameDelta(16, 2, 1)).toBe(32);
    expect(gameDelta(20, 1.5, 1)).toBe(30);
  });
  it('the dev scale multiplies the chosen speed', () => {
    expect(gameDelta(10, 2, 4)).toBe(80);
  });
});
