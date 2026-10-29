import { describe, expect, it } from 'vitest';
import { AI_COMMON } from '../config/aiBalance';
import { FogOfWarData } from '../map/FogOfWarData';
import { restoreMatch } from '../save/deserializer';
import { FIXED_DATE, STEP_MS, savableMatch } from '../save/savedMatch.testkit';
import { buildMatchAIs } from './matchAIs';

/** A save after 30 s of a 3-AI Medium match, and the same match restored from it. */
function savedMatch() {
  const match = savableMatch({ aiCount: 3 });
  match.run(30_000, STEP_MS);
  const save = match.snapshot(FIXED_DATE);
  return { save, restored: restoreMatch(save) };
}

describe('buildMatchAIs (shared by the live and the headless restore)', () => {
  it('restored AIs snapshot back to the saved AI states, through the saved fogs', () => {
    const { save, restored: r } = savedMatch();
    const ais = buildMatchAIs(r.players.ais(), { seed: r.setup.seed, difficulty: r.setup.difficulty, fogOf: (id) => r.fogs.get(id) ?? new FogOfWarData(1, 1), states: r.aiStates });
    expect(ais.map((a) => a.player.id)).toEqual(r.players.ais().map((p) => p.id));
    for (const ai of ais) {
      expect(ai.fog).toBe(r.fogs.get(ai.player.id));
      expect(ai.snapshot()).toEqual(save.ai[String(ai.player.id)]);
    }
  });

  it('a new match: seeded RNGs, staggered fog-scan phases', () => {
    const { restored: r } = savedMatch();
    const build = () => buildMatchAIs(r.players.ais(), { seed: r.setup.seed, difficulty: r.setup.difficulty, fogOf: () => new FogOfWarData(4, 4) });
    const [a, b] = [build(), build()];
    expect(a.map((ai) => ai.snapshot())).toEqual(b.map((ai) => ai.snapshot()));
    const n = r.players.ais().length;
    expect(a.map((ai) => ai.snapshot().fogDelayMs)).toEqual(a.map((_, i) => (AI_COMMON.fogScanMs * i) / n));
  });

  it('a saved state of another strategy kind throws (a failed load)', () => {
    const { restored: r } = savedMatch();
    const states = new Map([...r.aiStates].map(([id, s]) => [id, { ...s, strategy: { kind: 'null' as const } }]));
    expect(() => buildMatchAIs(r.players.ais(), { seed: r.setup.seed, difficulty: r.setup.difficulty, fogOf: () => new FogOfWarData(4, 4), states })).toThrow();
  });
});
