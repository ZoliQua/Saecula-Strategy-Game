import { describe, expect, it } from 'vitest';
import { defaultSetupConfig, VICTORY_MODES, withSetup } from '../../game/GameSetupConfig';
import type { SystemRunner, SystemRunnerOptions } from './SystemRunner';
import { prepareMatch, runnerFor } from './MatchStart';

describe('runnerFor (M19)', () => {
  it.each(VICTORY_MODES)('%s: the runner watches kings in Regicide only', (victory) => {
    const prepared = prepareMatch(withSetup(defaultSetupConfig(3), { template: 'meadow', mapSize: 'small', aiCount: 1, victory }));
    if (!prepared.ok) throw new Error('no match');
    let seen: SystemRunnerOptions | undefined;
    runnerFor(prepared.match.start, prepared.match.setup, (options) => {
      seen = options;
      return {} as SystemRunner;
    });
    expect(seen?.regicide).toBe(victory === 'regicide');
  });
});
