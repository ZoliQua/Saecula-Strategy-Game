import { describe, expect, it } from 'vitest';
import { hillState, inHillZone } from '../game/hill';
import { parseSave } from '../save/parse';
import { FIXED_DATE, MIN, STEP_MS, savableMatch } from '../save/savedMatch.testkit';
import type { SaveData } from '../save/schema';
import { resumeHeadlessMatch, type HeadlessMatch } from './testing/headlessMatch';

/** A save as a loaded slot hands it over. */
function parsed(json: string): SaveData {
  const result = parseSave(json);
  if (!result.ok) throw new Error(result.reason);
  return result.save;
}

/**
 * The AI of the M19 modes keeps nothing of its own beyond the saved wave (M19 Task 5): a match saved
 * while it plays resumes the same way every time, and the AI plays on. (A resumed match is not
 * compared with the unsaved one: the systems' own caches already part them in every mode.)
 */
describe('the AI of the M19 modes across a save (M19)', () => {
  it('King of the Hill: saved while a wave holds the hill', () => {
    const m = savableMatch({ victory: 'hill' });
    const holding = () => {
      const hill = hillState(m.world)!;
      return m.world.entities.some((e) => e.unit && e.owner && e.owner.playerId >= 2 && e.attacker && e.unit.unitType !== 'villager' && inHillZone(hill.centre, e.position!));
    };
    m.run(30 * MIN, STEP_MS, holding);
    expect(holding()).toBe(true);
    const clocks = (r: HeadlessMatch) => Object.values(hillState(r.world)!.heldMs).reduce((a, b) => a + b, 0);
    const save = JSON.stringify(m.snapshot(FIXED_DATE));
    const a = resumeHeadlessMatch(parsed(save));
    const before = clocks(a);
    a.run(3 * MIN, STEP_MS);
    const first = a.snapshot(FIXED_DATE);
    const b = resumeHeadlessMatch(parsed(save));
    b.run(3 * MIN, STEP_MS);
    expect(b.snapshot(FIXED_DATE)).toEqual(first);
    expect(clocks(a)).toBeGreaterThan(before);
  }, 60_000);

  it('Regicide: saved while a raid hunts a king', () => {
    const m = savableMatch({ victory: 'regicide' });
    const hunted = () => m.world.entities.some((e) => e.attackIntent && m.world.entities.find((k) => k.id === e.attackIntent!.targetId)?.unit?.unitType === 'king');
    m.run(20 * MIN, STEP_MS, hunted);
    expect(hunted()).toBe(true);
    const save = JSON.stringify(m.snapshot(FIXED_DATE));
    const a = resumeHeadlessMatch(parsed(save));
    a.run(MIN, STEP_MS);
    const first = a.snapshot(FIXED_DATE);
    const b = resumeHeadlessMatch(parsed(save));
    b.run(MIN, STEP_MS);
    expect(b.snapshot(FIXED_DATE)).toEqual(first);
  }, 60_000);
});
