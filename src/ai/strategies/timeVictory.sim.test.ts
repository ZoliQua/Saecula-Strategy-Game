import { describe, expect, it } from 'vitest';
import { TIME_VICTORY } from '../../config/balance';
import { timeLeader, timeRuleFor, standingFrom } from '../../game/timeVictory';
import { VictoryChecker } from '../../game/VictoryChecker';
import { parseSave } from '../../save/parse';
import v3Save from '../../save/migrations/fixtures/v3-m8.json';
import { STEP_MS } from '../../save/savedMatch.testkit';
import { resumeHeadlessMatch } from '../testing/headlessMatch';

function load(save: unknown) {
  const parsed = parseSave(JSON.stringify(save));
  if (!parsed.ok) throw new Error(`fixture did not parse: ${parsed.reason}`);
  return resumeHeadlessMatch(parsed.save);
}

/** The v3 fixture as a timed match whose clock reads `gameTimeMs`. */
const timedMatch = (gameTimeMs: number) => load({ ...v3Save, gameTimeMs, setup: { ...v3Save.setup, victory: 'conquest_time' } });

describe('time victory in a running match', () => {
  it('a loaded timed save plays up to the limit, then the score leader wins on time', () => {
    const match = timedMatch(TIME_VICTORY.limitMs - 20_000);
    const rule = timeRuleFor(match.setup.victory, match.stats, match.timeMs);
    expect(rule).not.toBeNull();
    const vc = new VictoryChecker(match.world, match.players, null, rule);
    let result = vc.check();
    expect(result.kind).toBe('playing');
    match.run(25_000, STEP_MS, () => {
      result = vc.check();
      return result.kind !== 'playing';
    });
    expect(match.timeMs()).toBeGreaterThanOrEqual(TIME_VICTORY.limitMs);
    expect(match.timeMs()).toBeLessThan(TIME_VICTORY.limitMs + 1000);
    const leader = timeLeader(match.players.all(), standingFrom(match.stats));
    expect(result).toEqual({ kind: leader === 1 ? 'victory' : 'defeat', winnerId: leader, cause: 'time' });
  });

  it('a conquest-only setup has no time rule', () => {
    const match = load(v3Save);
    expect(timeRuleFor(match.setup.victory, match.stats, match.timeMs)).toBeNull();
  });
});
