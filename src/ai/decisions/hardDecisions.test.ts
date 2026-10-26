import { describe, expect, it } from 'vitest';
import { directionToward, pointToward, wallLineAcross } from './fortify';
import { pickHarassTarget, raidOutnumbered, type SeenVillager } from './harass';
import {
  decayedPeak,
  enemyAgeSeen,
  enemyArmySeen,
  nextStance,
  type StanceSignals,
  type StanceState,
} from './stance';
import type { StanceTuning } from '../../config/aiBalance';

const MIN = 60_000;
const T: StanceTuning = {
  minDwellMs: 2 * MIN,
  turtleEnter: 4,
  turtleExit: 1.5,
  passiveAfterMs: 6 * MIN,
  rushEnter: 1,
  rushExit: 4,
};
const quiet = (timeMs: number, over: Partial<StanceSignals> = {}): StanceSignals => ({
  timeMs,
  aggression: 0,
  enemyArmySeen: 3,
  enemyAgeSeen: 1,
  ownAge: 1,
  ...over,
});
const at = (stance: StanceState['stance'], sinceMs = 0): StanceState => ({ stance, sinceMs });

describe('stance switching (Hard AI §10.3)', () => {
  it('stays balanced while nothing decisive is seen', () => {
    expect(nextStance(at('balanced'), quiet(10 * MIN), T).stance).toBe('balanced');
  });

  it('turtles when the enemy army keeps showing up at the base, at once (overrides the dwell time)', () => {
    const s = nextStance(at('rush', 10 * MIN), quiet(10.5 * MIN, { aggression: 5 }), T);
    expect(s).toEqual({ stance: 'turtle', sinceMs: 10.5 * MIN });
  });

  it('rushes a passive enemy, but only after the opening', () => {
    expect(nextStance(at('balanced'), quiet(4 * MIN, { enemyArmySeen: 0 }), T).stance).toBe('balanced');
    expect(nextStance(at('balanced'), quiet(7 * MIN, { enemyArmySeen: 0 }), T).stance).toBe('rush');
  });

  it('techs when later-age enemy units or buildings were seen', () => {
    expect(nextStance(at('balanced'), quiet(8 * MIN, { enemyAgeSeen: 2 }), T).stance).toBe('tech');
    // Same age as ours but age 3: still teching hard.
    expect(nextStance(at('rush'), quiet(30 * MIN, { enemyAgeSeen: 3, ownAge: 3, enemyArmySeen: 0 }), T).stance).toBe('tech');
    // Our own age matched and not age 3: no tech reading.
    expect(nextStance(at('balanced'), quiet(8 * MIN, { enemyAgeSeen: 2, ownAge: 2 }), T).stance).toBe('balanced');
  });

  it('leaves tech after the dwell once there is no tech reading any more (the AI caught up)', () => {
    let s = nextStance(at('balanced'), quiet(8 * MIN, { enemyAgeSeen: 2 }), T);
    expect(s.stance).toBe('tech');
    // Caught up inside the dwell time: still tech.
    s = nextStance(s, quiet(9 * MIN, { enemyAgeSeen: 2, ownAge: 2 }), T);
    expect(s.stance).toBe('tech');
    s = nextStance(s, quiet(10.5 * MIN, { enemyAgeSeen: 2, ownAge: 2 }), T);
    expect(s).toEqual({ stance: 'balanced', sinceMs: 10.5 * MIN });
  });

  it('hysteresis: keeps a stance through the dwell time and between the enter / exit thresholds', () => {
    // Rush entered at 7 min; the enemy shows a little army (2: above rushEnter, below rushExit).
    let s = nextStance(at('balanced'), quiet(7 * MIN, { enemyArmySeen: 0 }), T);
    s = nextStance(s, quiet(7.1 * MIN, { enemyArmySeen: 2 }), T);
    expect(s.stance).toBe('rush');
    // A big army is seen inside the dwell time: still rush.
    s = nextStance(s, quiet(8 * MIN, { enemyArmySeen: 6 }), T);
    expect(s.stance).toBe('rush');
    // After the dwell time, the big army ends the rush.
    s = nextStance(s, quiet(9.5 * MIN, { enemyArmySeen: 6 }), T);
    expect(s.stance).toBe('balanced');

    // Turtle holds while aggression decays between exit (1.5) and enter (4).
    let t = nextStance(at('balanced'), quiet(10 * MIN, { aggression: 5 }), T);
    t = nextStance(t, quiet(13 * MIN, { aggression: 2 }), T);
    expect(t.stance).toBe('turtle');
    t = nextStance(t, quiet(14 * MIN, { aggression: 1 }), T);
    expect(t.stance).toBe('balanced');
  });

  it('does not flip-flop when the signals oscillate around one threshold', () => {
    let s: StanceState = at('balanced');
    const seen: string[] = [];
    for (let i = 0; i < 40; i++) {
      // Enemy army sightings bounce 0 / 2 every 15 s from minute 7 onwards.
      s = nextStance(s, quiet(7 * MIN + i * 15_000, { enemyArmySeen: i % 2 === 0 ? 0 : 2 }), T);
      seen.push(s.stance);
    }
    expect(new Set(seen)).toEqual(new Set(['rush']));
  });

  it('aggression memory: peak hold with decay', () => {
    expect(decayedPeak(0, 3, 1000, 0.5)).toBe(3);
    expect(decayedPeak(4, 0, MIN, 0.5)).toBeCloseTo(2, 6);
    expect(decayedPeak(4, 3, MIN, 0.5)).toBe(3);
  });

  it('reads army size and enemy age only from sightings and known buildings', () => {
    expect(enemyArmySeen({ villager: 9, scout: 2, swordsman: 3, archer: 1.5 })).toBeCloseTo(4.5, 6);
    expect(enemyAgeSeen({ swordsman: 4 }, [{ type: 'barracks' }], 0.5)).toBe(1);
    expect(enemyAgeSeen({ knight: 1 }, [], 0.5)).toBe(2);
    // A faded sighting no longer counts.
    expect(enemyAgeSeen({ musketeer: 0.1 }, [], 0.5)).toBe(1);
    expect(enemyAgeSeen({}, [{ type: 'foundry' }], 0.5)).toBe(3);
  });
});

describe('harass target selection', () => {
  const v = (tx: number, ty: number, ownerId = 1, seenAtMs = 0): SeenVillager => ({ ownerId, position: { tx, ty }, seenAtMs });
  const opts = { enemyId: 1, home: { tx: 0, ty: 0 }, clusterRadius: 3, avoidRadius: 8 };

  it('picks the spot with the most remembered villagers of the enemy', () => {
    const seen = [v(40, 40), v(41, 40), v(40, 42), v(20, 20), v(60, 60, 3), v(61, 60, 3), v(60, 61, 3), v(61, 61, 3)];
    expect(pickHarassTarget(seen, [], opts)).toEqual({ position: { tx: 40, ty: 40 }, villagers: 3 });
  });

  it('skips spots covered by a known enemy tower', () => {
    const seen = [v(40, 40), v(41, 40), v(40, 42), v(20, 20)];
    const towers = [{ type: 'tower' as const, ownerId: 1, position: { tx: 44, ty: 44 } }];
    expect(pickHarassTarget(seen, towers, opts)?.position).toEqual({ tx: 20, ty: 20 });
    // Non-shooting buildings do not matter.
    expect(pickHarassTarget(seen, [{ type: 'house', ownerId: 1, position: { tx: 44, ty: 44 } }], opts)?.villagers).toBe(3);
  });

  it('breaks ties by freshness, then by distance from home', () => {
    expect(pickHarassTarget([v(30, 30, 1, 5), v(10, 10, 1, 9)], [], opts)?.position).toEqual({ tx: 10, ty: 10 });
    expect(pickHarassTarget([v(30, 30), v(10, 10)], [], opts)?.position).toEqual({ tx: 10, ty: 10 });
  });

  it('null without any villager of the enemy seen', () => {
    expect(pickHarassTarget([v(5, 5, 3)], [], opts)).toBeNull();
    expect(pickHarassTarget([], [], opts)).toBeNull();
  });

  it('a raid retreats when outnumbered', () => {
    expect(raidOutnumbered(3, 3, 1)).toBe(false);
    expect(raidOutnumbered(3, 4, 1)).toBe(true);
    expect(raidOutnumbered(0, 0, 1)).toBe(true);
  });
});

describe('turtle fortification geometry', () => {
  const home = { tx: 20, ty: 20 };

  it('snaps the threat direction to the eight tile directions', () => {
    expect(directionToward(home, { tx: 40, ty: 21 })).toEqual({ tx: 1, ty: 0 });
    expect(directionToward(home, { tx: 30, ty: 31 })).toEqual({ tx: 1, ty: 1 });
    expect(directionToward(home, { tx: 19, ty: 5 })).toEqual({ tx: 0, ty: -1 });
    expect(directionToward(home, home)).toBeNull();
  });

  it('puts a tower spot toward the threat', () => {
    expect(pointToward(home, { tx: 40, ty: 20 }, 6)).toEqual({ tx: 26, ty: 20 });
    expect(pointToward(home, { tx: 40, ty: 40 }, 6)).toEqual({ tx: 24, ty: 24 });
  });

  it('lays the wall line across the approach, centred on it', () => {
    const line = wallLineAcross(home, { tx: 40, ty: 20 }, 9, 3);
    expect(line).toEqual([29, 29, 29, 29, 29, 29, 29].map((tx, i) => ({ tx, ty: 17 + i })));
    const diag = wallLineAcross(home, { tx: 40, ty: 40 }, 9, 3);
    // Perpendicular to (1,1): runs along (-1,1) through (26,26).
    expect(diag).toContainEqual({ tx: 26, ty: 26 });
    expect(diag.every((t) => t.tx + t.ty === 52)).toBe(true);
  });
});
