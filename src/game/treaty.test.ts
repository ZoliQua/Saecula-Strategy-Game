import { describe, expect, it } from 'vitest';
import { NO_TEAMS } from './diplomacy';
import { createPlayers } from './PlayerManager';
import { NO_TREATY, TreatyClock, treatyActive, treatyLeftMs, truceBetween } from './treaty';

describe('treaty clock (M16)', () => {
  it('holds until treatyMin game minutes, then is over', () => {
    const setup = { treatyMin: 10 };
    expect(treatyActive(setup, 0)).toBe(true);
    expect(treatyActive(setup, 599_999)).toBe(true);
    expect(treatyActive(setup, 600_000)).toBe(false);
    expect(treatyLeftMs(setup, 0)).toBe(600_000);
    expect(treatyLeftMs(setup, 590_500)).toBe(9_500);
    expect(treatyLeftMs(setup, 700_000)).toBe(0);
  });

  it('no treaty (0 minutes) never holds', () => {
    expect(treatyActive({ treatyMin: 0 }, 0)).toBe(false);
    expect(treatyLeftMs({ treatyMin: 0 }, 0)).toBe(0);
    expect(NO_TREATY()).toBe(false);
  });

  it('a save loaded mid-treaty continues from its game time', () => {
    const clock = new TreatyClock({ treatyMin: 20 }, 19 * 60_000);
    expect(clock.gate()).toBe(true);
    expect(clock.leftMs()).toBe(60_000);
    clock.advance(59_999);
    expect(clock.gate()).toBe(true);
    clock.advance(1);
    expect(clock.gate()).toBe(false);
    expect(clock.leftMs()).toBe(0);
  });

  it('a truce is between players of different teams only; never with Gaia, never within a team', () => {
    const on = () => true;
    expect(truceBetween(on, NO_TEAMS, 1, 2)).toBe(true);
    expect(truceBetween(on, NO_TEAMS, 1, 0)).toBe(false);
    expect(truceBetween(on, NO_TEAMS, 1, 1)).toBe(false);
    expect(truceBetween(NO_TREATY, NO_TEAMS, 1, 2)).toBe(false);
    const teams = createPlayers('hungarian', ['english', 'german'], undefined, 1);
    expect(truceBetween(on, teams, 1, 2)).toBe(false);
    expect(truceBetween(on, teams, 1, 3)).toBe(true);
  });
});
