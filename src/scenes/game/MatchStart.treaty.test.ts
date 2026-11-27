import { beforeAll, describe, expect, it } from 'vitest';
import { treatyClockFor } from '../../game/treaty';
import { FIXED_DATE, STEP_MS, savableMatch } from '../../save/savedMatch.testkit';
import type { SaveData } from '../../save/schema';
import type { SystemRunner, SystemRunnerOptions } from './SystemRunner';
import { prepareMatch, runnerFor } from './MatchStart';

let save: SaveData;
beforeAll(() => {
  const match = savableMatch();
  match.run(2_000, STEP_MS);
  save = match.snapshot(FIXED_DATE);
});

/** The options runnerFor hands the SystemRunner for `data` (a load through prepareMatch, as the GameScene does). */
function runnerOptions(data: SaveData): SystemRunnerOptions {
  const prepared = prepareMatch({ load: data });
  if (!prepared.ok) throw new Error('the save did not restore');
  let seen: SystemRunnerOptions | null = null;
  runnerFor(prepared.match.start, prepared.match.setup, (o) => {
    seen = o;
    return {} as SystemRunner;
  });
  if (!seen) throw new Error('runnerFor built no runner');
  return seen;
}

describe('a match restored mid-treaty (M16)', () => {
  it('a save at 4:00 into a 10-minute treaty has 6:00 of treaty left', () => {
    const options = runnerOptions({ ...save, gameTimeMs: 240_000, setup: { ...save.setup, treatyMin: 10 } });
    expect(options.treatyMin).toBe(10);
    expect(options.startMs).toBe(240_000);
    const clock = treatyClockFor(options);
    expect(clock.leftMs()).toBe(360_000);
    expect(clock.gate()).toBe(true);
    clock.advance(360_000);
    expect(clock.gate()).toBe(false);
  });

  it('a save past the treaty end restores with none left', () => {
    const options = runnerOptions({ ...save, gameTimeMs: 700_000, setup: { ...save.setup, treatyMin: 10 } });
    const clock = treatyClockFor(options);
    expect(clock.leftMs()).toBe(0);
    expect(clock.gate()).toBe(false);
  });
});
