import { describe, expect, it } from 'vitest';
import { AI_EASY, AI_KING } from '../../config/aiBalance';
import type { Difficulty, VictoryMode } from '../../game/GameSetupConfig';
import { hillState } from '../../game/hill';
import { distanceToFootprint } from '../../game/landmarks';
import type { MapTemplate } from '../../map/generator';
import { createRng } from '../../map/random';
import { aiRngSeed, createStrategy } from '../createStrategy';
import { createHeadlessMatch, type HeadlessMatch } from '../testing/headlessMatch';

const MIN = 60_000;
const LEVELS: readonly Difficulty[] = ['easy', 'medium', 'hard', 'master'];

/** A 1v1 of `level` AIs, the human slot driven by one too (without the AI slot's gather handicap, as in every headless sim). */
function duel(victory: VictoryMode, template: MapTemplate, seed: number, level: Difficulty, treatyMin: 0 | 10 = 0): HeadlessMatch {
  const strategy = (id: number) => createStrategy(level, createRng(aiRngSeed(seed, id)));
  return createHeadlessMatch({
    seed, size: 64, template, aiCount: 1, victory, treatyMin,
    strategy, difficulty: () => level, humanStrategy: strategy(1),
  });
}

describe.each(LEVELS)('the M19 modes start and are played at %s (64×64 meadow)', (level) => {
  it('Regicide: through a 10-minute treaty both kings live on at home', () => {
    const m = duel('regicide', 'meadow', 3, level, 10);
    const kings = m.world.entities.filter((e) => e.unit?.unitType === 'king');
    const homes = new Map(m.world.entities.filter((e) => e.building?.type === 'town_center').map((tc) => [tc.owner!.playerId, tc]));
    const radius = (level === 'easy' ? AI_EASY.king : AI_KING).homeRadius;
    let farthest = 0;
    m.run(10 * MIN, 100, (t) => {
      if (t % 1000) return;
      for (const k of kings) {
        const tc = homes.get(k.owner!.playerId)!;
        farthest = Math.max(farthest, distanceToFootprint(k.position!, tc.position!, tc.building!.footprint));
      }
    });
    expect(kings).toHaveLength(2);
    expect(kings.every((k) => !k.dying && k.health!.current === k.health!.max)).toBe(true);
    expect(farthest).toBeLessThanOrEqual(radius);
    expect(m.judge()).toEqual({ kind: 'playing' });
  });

  it('King of the Hill: an AI goes to the hill and holds it', () => {
    const m = duel('hill', 'meadow', 11, level);
    const held = () => Math.max(0, ...Object.values(hillState(m.world)!.heldMs));
    m.run(30 * MIN, 100, () => held() >= MIN);
    expect(held()).toBeGreaterThanOrEqual(MIN);
  });
});

/**
 * Hard against Hard, the human slot driven by a Hard AI as well (no gather handicap there, as in the
 * other headless sims), 64×64, seeds 1, 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31 outside the suite:
 * every match was decided within 60 game minutes (winner, cause and minute in
 * .superpowers/sdd/2026-12-02-m19-game-modes/task-5-report.md). Medians: King of the Hill 14.4 min
 * (meadow), 14.4 (wilderness), 14.1 (fortress); Regicide 6.2 (meadow), 6.5 (fortress), 21.9
 * (archipelago, longest 59.8 on seed 11). Kept here: one seed per map, about 12 s.
 */
describe('Hard v Hard: each mode is decided within 60 game minutes', () => {
  it.each([
    // In the sweep: decided at 14.4, 20.9, 21.3, 9.2, 7.0 and 19.1 min.
    ['hill', 'meadow', 3],
    ['hill', 'wilderness', 7],
    ['hill', 'fortress', 19],
    ['regicide', 'meadow', 13],
    ['regicide', 'fortress', 7],
    ['regicide', 'archipelago', 17],
  ] as const)('%s on %s, seed %i', (victory, template, seed) => {
    const m = duel(victory, template, seed, 'hard');
    m.run(60 * MIN, 100, () => m.judge().kind !== 'playing');
    expect(m.judge()).toMatchObject({ cause: victory });
    expect(m.timeMs()).toBeLessThanOrEqual(60 * MIN);
  });
});
