import { describe, expect, it } from 'vitest';
import { AI_EASY, AI_HARD, AI_HILL, AI_MEDIUM } from '../../config/aiBalance';
import { HILL } from '../../config/balance';
import { chebyshev } from '../../iso/coordinates';
import { inHillZone } from '../../game/hill';
import { MapData } from '../../map/MapData';
import { hillLaunchReady, hillSpots, rivalPastHalf, type HillLaunch } from './hill';

const CENTRE = { tx: 20, ty: 20 };
const READY: HillLaunch = {
  urgent: false, out: false, army: 12, wave: 12, timeMs: 600_000, notBeforeMs: 300_000, opened: true, underAttack: false,
};

describe('hillLaunchReady (M19)', () => {
  const tune = AI_MEDIUM.hill;
  const ready = (over: Partial<HillLaunch>) => hillLaunchReady({ ...READY, ...over }, tune);

  it('the first wave follows the usual rule', () => {
    expect(ready({})).toBe(true);
    expect(ready({ army: 11 })).toBe(false);
    expect(ready({ timeMs: 299_999 })).toBe(false);
    expect(ready({ opened: false })).toBe(false);
    expect(ready({ wave: Infinity, army: 99 })).toBe(false);
  });

  it('a hold takes smaller reinforcements, but not from a base under attack', () => {
    expect(ready({ out: true, army: tune.reinforce })).toBe(true);
    expect(ready({ out: true, army: tune.reinforce - 1 })).toBe(false);
    expect(ready({ out: true, army: tune.reinforce, underAttack: true })).toBe(false);
  });

  it('urgency needs only urgentArmy, whatever the time, the raid or the base', () => {
    const urgent = { urgent: true, army: tune.urgentArmy, timeMs: 0, opened: false, underAttack: true };
    expect(ready(urgent)).toBe(true);
    expect(ready({ ...urgent, out: true })).toBe(true);
    expect(ready({ ...urgent, army: tune.urgentArmy - 1 })).toBe(false);
    expect(ready({ urgent: true, army: 0 })).toBe(false);
  });

  it('every level tunes it smaller than its wave', () => {
    for (const t of [AI_EASY, AI_MEDIUM, AI_HARD]) {
      expect(t.hill.urgentArmy).toBeLessThan(t.attackWave);
      expect(t.hill.reinforce).toBeLessThan(t.attackWave);
      expect(t.hill.urgentArmy).toBeGreaterThan(0);
    }
  });
});

describe('rivalPastHalf (M19)', () => {
  const half = HILL.holdMs * AI_HILL.urgentShare;

  it('any standing enemy team past half', () => {
    expect(AI_HILL.urgentShare).toBe(0.5);
    expect(rivalPastHalf({ heldMs: { 1: half }, standingTeams: new Set([1, 2]) }, 2)).toBe(false);
    expect(rivalPastHalf({ heldMs: { 1: half + 1 }, standingTeams: new Set([1, 2]) }, 2)).toBe(true);
    expect(rivalPastHalf({ heldMs: { 3: half + 1 }, standingTeams: new Set([1, 2, 3]) }, 2)).toBe(true);
  });

  it("not the own team's, nor one that is out", () => {
    expect(rivalPastHalf({ heldMs: { 2: half + 1 }, standingTeams: new Set([1, 2]) }, 2)).toBe(false);
    expect(rivalPastHalf({ heldMs: { 3: half + 1 }, standingTeams: new Set([1, 2]) }, 2)).toBe(false);
  });
});

describe('hillSpots (M19)', () => {
  it('a few spread passable tiles of the zone', () => {
    const map = new MapData(40, 40);
    map.setBlocked(20, 20, true);
    const spots = hillSpots(map, CENTRE);
    expect(spots).toHaveLength(AI_HILL.spots);
    expect(new Set(spots.map((s) => `${s.tx},${s.ty}`)).size).toBe(spots.length);
    for (const s of spots) {
      expect(inHillZone(CENTRE, s)).toBe(true);
      expect(map.isPassable(s.tx, s.ty)).toBe(true);
    }
    expect(Math.max(...spots.flatMap((a) => spots.map((b) => chebyshev(a, b))))).toBeGreaterThanOrEqual(3);
  });

  it('skips a pocket sealed inside the zone', () => {
    const map = new MapData(40, 40);
    for (let d = -2; d <= 2; d++) {
      for (const [tx, ty] of [[20 + d, 18], [20 + d, 22], [18, 20 + d], [22, 20 + d]] as const) map.setBlocked(tx, ty, true);
    }
    for (const s of hillSpots(map, CENTRE)) expect(chebyshev(s, CENTRE)).toBe(3);
    expect(hillSpots(map, CENTRE).length).toBeGreaterThan(0);
  });
});
