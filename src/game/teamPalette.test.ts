import { afterEach, describe, expect, it } from 'vitest';
import { restoreMatch } from '../save/deserializer';
import { FIXED_DATE, savableMatch } from '../save/savedMatch.testkit';
import { CB_PLAYER_COLORS, createPlayer, playerColor, PLAYER_COLORS, setTeamPalette } from './Player';

afterEach(() => {
  setTeamPalette('default');
});

describe('team palettes', () => {
  it('both palettes have 6 distinct colours', () => {
    expect(new Set(PLAYER_COLORS).size).toBe(6);
    expect(new Set(CB_PLAYER_COLORS).size).toBe(6);
    expect(CB_PLAYER_COLORS).toEqual([0xe69f00, 0x56b4e9, 0x009e73, 0xf0e442, 0x0072b2, 0xd55e00]);
  });

  it('playerColor follows the setter, wraps, and keeps Gaia white', () => {
    expect(playerColor(1)).toBe(0x4a8ad0);
    expect(playerColor(7)).toBe(PLAYER_COLORS[0]);
    setTeamPalette('colorblind');
    expect(playerColor(1)).toBe(0xe69f00);
    expect(playerColor(6)).toBe(0xd55e00);
    expect(playerColor(0)).toBe(0xffffff);
    expect(createPlayer({ id: 2 }).color).toBe(0x56b4e9);
  });

  it("a loaded save's players get the active palette's colours", () => {
    const match = savableMatch();
    const save = match.snapshot(FIXED_DATE);
    setTeamPalette('colorblind');
    for (const p of restoreMatch(save).players.all()) expect(p.color).toBe(CB_PLAYER_COLORS[(p.id - 1) % 6]);
    setTeamPalette('default');
    for (const p of restoreMatch(save).players.all()) expect(p.color).toBe(PLAYER_COLORS[(p.id - 1) % 6]);
  });
});
