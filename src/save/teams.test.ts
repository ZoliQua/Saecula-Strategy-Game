import { describe, expect, it } from 'vitest';
import { restoreMatch } from './deserializer';
import { FIXED_DATE, savableMatch } from './savedMatch.testkit';

describe('teams after a load (M16)', () => {
  it('are derived from the saved setup, not saved themselves', () => {
    const save = savableMatch({ aiCount: 3 }).snapshot(FIXED_DATE);
    expect(save.players.every((p) => !('team' in p))).toBe(true);
    expect(restoreMatch(save).players.all().map((p) => p.team)).toEqual([1, 2, 3, 4]);
    const allied = restoreMatch({ ...save, setup: { ...save.setup, allies: 1 } });
    expect(allied.players.all().map((p) => p.team)).toEqual([1, 1, 2, 2]);
  });
});
