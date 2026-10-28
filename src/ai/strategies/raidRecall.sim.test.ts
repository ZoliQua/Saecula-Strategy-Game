import { describe, expect, it } from 'vitest';
import { AI_MEDIUM, type MediumTuning } from '../../config/aiBalance';
import { createRng } from '../../map/random';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { MediumStrategy } from './MediumStrategy';

const MIN = 60_000;
const SEED = 8;

/** Medium (player 2) against the passive human: when its raid left and when a wave was first called home. */
function play(tune: MediumTuning): { raidAt: number; retreatAt: number; mainWaveAt: number } {
  const ai = new MediumStrategy(createRng(2 * 977 + SEED), tune);
  const match = createHeadlessMatch({ seed: SEED, size: 64, aiCount: 1, strategy: () => ai });
  const out = { raidAt: Infinity, retreatAt: Infinity, mainWaveAt: Infinity };
  const seen = new Set<string>();
  match.run(22 * MIN, 100, (t) => {
    for (const r of ai.thoughts().recent) {
      const key = `${r.timeMs}|${r.kind}|${r.detail}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (r.kind === 'attack' && out.raidAt === Infinity) out.raidAt = r.timeMs;
      else if (r.kind === 'attack' && out.mainWaveAt === Infinity) out.mainWaveAt = r.timeMs;
      if (r.kind === 'retreat' && out.retreatAt === Infinity) out.retreatAt = r.timeMs;
    }
    void t;
  });
  return out;
}

/**
 * `pressure.recallMs` (Mesteri's table only): the scout raid is called home that long after it left,
 * so the main wave can go. Without it (Medium, Hard) a raid that keeps 3 scouts alive stays out.
 * Measured: raid at 6.57 min; plain: no retreat and no main wave by 22 min; recallMs 60 s: called home
 * 63.2 s after it left, main wave at 17.10 min.
 */
describe('pressure raid recall (64×64 meadow, passive human, Medium seed 8)', () => {
  it('without recallMs the raid stays out; with it the raid is called home on time and a main wave can leave', () => {
    const plain = play(AI_MEDIUM);
    expect(plain.raidAt).toBeLessThan(8 * MIN);
    expect(plain.retreatAt).toBe(Infinity);
    expect(plain.mainWaveAt).toBe(Infinity);

    const recall = 60_000;
    const recalled = play({ ...AI_MEDIUM, pressure: { ...AI_MEDIUM.pressure, recallMs: recall } });
    expect(recalled.raidAt).toBe(plain.raidAt);
    // Checked on the decision cycle (10-15 s for Medium): not before the recall time, within one cycle after.
    expect(recalled.retreatAt - recalled.raidAt).toBeGreaterThanOrEqual(recall);
    expect(recalled.retreatAt - recalled.raidAt).toBeLessThanOrEqual(recall + AI_MEDIUM.decisionMs.max);
    expect(recalled.mainWaveAt).toBeLessThan(22 * MIN);
  }, 120_000);
});
