import { describe, expect, it } from 'vitest';
import { HILL } from '../../config/balance';
import { HILL_HUD } from '../../config/visual';
import type { HillClockRow, HillClocksInfo } from '../../game/hillClocks';
import { hu } from '../../i18n/hu';
import { hillClockView } from './HillClock';

const row = (over: Partial<HillClockRow> = {}): HillClockRow => ({
  team: 2, playerId: 2, civ: 'english', color: 0xd04a4a, own: false, holder: false, out: false, remainingMs: HILL.holdMs, ...over,
});
const human = (over: Partial<HillClockRow> = {}) => row({ team: 1, playerId: 1, civ: 'hungarian', color: 0x4a8ad0, own: true, ...over });
const info = (over: Partial<HillClocksInfo> = {}): HillClocksInfo => ({
  centre: { tx: 16, ty: 16 }, status: 'empty', color: null, holder: null, teams: false, waiting: false, rows: [human()], ...over,
});

describe('hill clock view (M19)', () => {
  it('names each state in words', () => {
    expect(hillClockView(info()).state).toBe('Üres');
    expect(hillClockView(info({ status: 'contested' })).state).toBe('Vitatott');
    expect(hillClockView(info({ status: 'held', holder: 'own' })).state).toBe('Te tartod');
    expect(hillClockView(info({ status: 'held', holder: 'other' })).state).toBe('Ellenfél tartja');
    expect(hillClockView(info({ status: 'held', holder: 'own', teams: true })).state).toBe('Csapatod tartja');
  });

  it('counts down to the win, seconds rounded up', () => {
    const times = [HILL.holdMs, 65_400, 1, 0].map((remainingMs) => hillClockView(info({ rows: [human({ remainingMs })] })).rows[0]?.time);
    expect(times).toEqual(['8:00', '1:06', '0:01', '0:00']);
  });

  it('fills the bar with the time held', () => {
    expect(hillClockView(info({ rows: [human({ remainingMs: HILL.holdMs / 4 })] })).rows[0]?.done).toBe(0.75);
  });

  it('the human is "Te", others go by civ; in teams the rows are the teams', () => {
    const rows = [human(), row()];
    expect(hillClockView(info({ rows })).rows.map((r) => r.name)).toEqual(['Te', 'Angol']);
    expect(hillClockView(info({ rows, teams: true })).rows.map((r) => r.name)).toEqual(['Csapatod', 'Ellenséges csapat']);
  });

  it('keeps the order and the holder mark', () => {
    const rows = hillClockView(info({ rows: [row({ holder: true }), human()] })).rows;
    expect(rows.map((r) => [r.team, r.holder, r.own])).toEqual([[2, true, false], [1, false, true]]);
  });

  it('says that the clocks wait for the treaty, whoever stands there', () => {
    const view = hillClockView(info({ waiting: true, status: 'held', holder: 'other' }));
    expect(view.waiting).toBe(true);
    expect(view.note).toBe(hu.hill.waiting);
    expect(view.state).toBe('Ellenfél tartja');
  });

  it('warns when an enemy is close, never for the own clock or a team that is out', () => {
    const at = (r: HillClockRow) => hillClockView(info({ rows: [r] }));
    const warned = at(row({ remainingMs: HILL_HUD.warnMs }));
    expect([warned.warn, warned.rows[0]?.warn, warned.note]).toEqual([true, true, hu.hill.nearWin]);
    expect(at(row({ remainingMs: HILL_HUD.warnMs + 1 })).warn).toBe(false);
    expect(at(human({ remainingMs: 1000 })).warn).toBe(false);
    expect(at(row({ remainingMs: 1000, out: true })).warn).toBe(false);
    expect(hillClockView(info()).note).toBe('');
  });

  it('the waiting note comes before the warning', () => {
    expect(hillClockView(info({ waiting: true, rows: [row({ remainingMs: 1000 })] })).note).toBe(hu.hill.waiting);
  });

  it('more than three clocks go in two columns, so six players fit under the treaty clock', () => {
    const rows = [human(), ...[2, 3, 4, 5, 6].map((id) => row({ team: id, playerId: id }))];
    expect(hillClockView(info({ rows })).columns).toBe(2);
    expect(hillClockView(info({ rows: rows.slice(0, 3) })).columns).toBe(1);
  });

  it('the tip states the goal from the balance table', () => {
    expect(hu.hill.tip).toContain(`${HILL.holdMs / 60_000} percig`);
  });
});
