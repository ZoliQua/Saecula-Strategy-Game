import { afterEach, describe, expect, it } from 'vitest';
import { HILL } from '../config/balance';
import type { HillState } from './hill';
import { hillClocks, hillLook } from './hillClocks';
import { CB_PLAYER_COLORS, playerColor, setTeamPalette } from './Player';
import { createPlayers } from './PlayerManager';

const CENTRE = { tx: 16, ty: 16 };
const hill = (over: Partial<HillState> = {}): HillState => ({ centre: CENTRE, heldMs: {}, holderTeam: null, contested: false, ...over });
const match = (allies = 0) => createPlayers('hungarian', ['english', 'german', 'french', 'spanish', 'italian'], undefined, allies);

afterEach(() => void setTeamPalette('default'));

describe('hillLook (M19)', () => {
  it('empty is neutral, held has the holder colour, contested has no colour', () => {
    const players = match();
    expect(hillLook(hill(), players)).toEqual({ status: 'empty', color: null });
    expect(hillLook(hill({ holderTeam: 4 }), players)).toEqual({ status: 'held', color: playerColor(4) });
    expect(hillLook(hill({ contested: true }), players)).toEqual({ status: 'contested', color: null });
  });

  it('a team has the colour of its lowest-id standing player', () => {
    const players = match(2);
    const held = (holderTeam: number) => hillLook(hill({ holderTeam }), players).color;
    expect([held(1), held(2)]).toEqual([playerColor(1), playerColor(4)]);
    players.markDefeated(4);
    expect(held(2)).toBe(playerColor(5));
  });

  it('follows the colour-blind palette', () => {
    setTeamPalette('colorblind');
    expect(hillLook(hill({ holderTeam: 3 }), match()).color).toBe(CB_PLAYER_COLORS[2]);
  });
});

describe('hillClocks (M19)', () => {
  it('an untouched hill shows only the human, with the whole time left', () => {
    const info = hillClocks(hill(), match(), false);
    expect(info).toMatchObject({ centre: CENTRE, status: 'empty', color: null, holder: null, teams: false, waiting: false });
    expect(info.rows).toEqual([
      { team: 1, playerId: 1, civ: 'hungarian', color: playerColor(1), own: true, holder: false, out: false, remainingMs: HILL.holdMs },
    ]);
  });

  it('every team with a clock and the human, leading first, ties by team', () => {
    const info = hillClocks(hill({ heldMs: { 5: 9000, 2: 30_000, 3: 9000 } }), match(), false);
    expect(info.rows.map((r) => r.team)).toEqual([2, 3, 5, 1]);
    expect(info.rows.map((r) => HILL.holdMs - r.remainingMs)).toEqual([30_000, 9000, 9000, 0]);
  });

  it('marks the holder, shown even before its clock has run', () => {
    const info = hillClocks(hill({ holderTeam: 6, heldMs: { 2: 1000 } }), match(), false);
    expect(info).toMatchObject({ status: 'held', holder: 'other', color: playerColor(6) });
    expect(info.rows.map((r) => [r.team, r.holder])).toEqual([[2, false], [1, false], [6, true]]);
    expect(hillClocks(hill({ holderTeam: 1 }), match(), false).holder).toBe('own');
  });

  it('contested: nobody holds, the clocks stay', () => {
    const info = hillClocks(hill({ contested: true, heldMs: { 2: 1000 } }), match(), false);
    expect(info).toMatchObject({ status: 'contested', color: null, holder: null });
    expect(info.rows.some((r) => r.holder)).toBe(false);
    expect(info.rows).toHaveLength(2);
  });

  it('teams share one row in the colour of the lowest-id standing member', () => {
    const players = match(2);
    players.markDefeated(4);
    const info = hillClocks(hill({ heldMs: { 2: 2000, 1: 1000 }, holderTeam: 1 }), players, false);
    expect(info).toMatchObject({ teams: true, holder: 'own' });
    expect(info.rows.map((r) => [r.team, r.playerId, r.own, r.color])).toEqual([[2, 5, false, playerColor(5)], [1, 1, true, playerColor(1)]]);
  });

  it('a team wholly out keeps its row, marked and last: its clock can win nothing', () => {
    const players = match();
    players.markDefeated(3);
    const info = hillClocks(hill({ heldMs: { 3: HILL.holdMs, 2: 1000 } }), players, false);
    expect(info.rows.map((r) => [r.team, r.out])).toEqual([[2, false], [1, false], [3, true]]);
  });

  it('never shows less than nothing left', () => {
    expect(hillClocks(hill({ heldMs: { 1: HILL.holdMs + 50 } }), match(), false).rows[0]?.remainingMs).toBe(0);
  });

  it('carries whether the treaty makes the clocks wait; presence still shows', () => {
    expect(hillClocks(hill({ holderTeam: 2 }), match(), true)).toMatchObject({ waiting: true, status: 'held', holder: 'other' });
  });
});
