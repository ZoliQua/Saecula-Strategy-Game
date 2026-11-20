import { describe, expect, it, vi } from 'vitest';
import { createRng } from '../../map/random';
import type { AIContext } from '../AIPlayer';
import { ArmyControl } from '../ArmyControl';
import { FlankControl } from '../FlankControl';
import { HarassControl } from '../HarassControl';
import { LandingControl } from '../LandingControl';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { HardStrategy } from './HardStrategy';

const MIN = 60_000;
const TREATY_MS = 10 * MIN;
const SEED = Number(process.env['TREATY_SEED'] ?? 3);

/** Every hit in the match (all damage goes through game/kill's applyDamage): when, who dealt it to whom. */
const hits = vi.hoisted(() => [] as { atMs: number; killer: number | null; victim: number; building: boolean }[]);
const clock = vi.hoisted(() => ({ now: (): number => 0 }));
vi.mock('../../game/kill', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../game/kill')>();
  return {
    ...actual,
    applyDamage: (...args: Parameters<typeof actual.applyDamage>) => {
      const [, target, , killer] = args;
      if (!target.dying) hits.push({ atMs: clock.now(), killer: killer ?? null, victim: target.owner?.playerId ?? 0, building: target.building !== undefined });
      return actual.applyDamage(...args);
    },
  };
});

/**
 * The treaty (M16) without a browser: 64×64 meadow, Hard (player 2) against
 * an AI-driven Hard human (player 1), `treatyMin: 10`. Pins that no damage is
 * dealt between the players before 10:00, that no offensive launch point
 * (wave, pressure raid, harass, Master flank, landing) fires before then, and
 * that an attack (damage to the other player's units or buildings) lands
 * within 6 minutes after the end: the treaty only gates launches, so an AI
 * ready earlier goes right after it.
 * Seed sweep (3, 5, 7, 11, 19, 23; TREATY_SEED=<n> runs another): every seed
 * passes; none has a hit or a launch between the players before 10:00. The
 * first wave leaves at 10:00–10:02 and the first hit lands at 10:01–10:09; the
 * first hit on a building at 14:10 (3), 11:26 (7), 12:08 (11), 11:53 (19), none
 * within 16:00 with 5 and 23 (their waves fight in the field). With 3 about 2 s.
 * Red checks: with the systems' treaty gate off, 373 hits land before 10:00
 * (the first at 5:01); with only the AI's `treatyActive` off, two waves are
 * launched before 10:00 (the ArmyControl choke point still holds them).
 */
describe('treaty (M16): Hard vs AI-driven Hard on a 64×64 meadow, treatyMin 10', () => {
  it('no damage between players before 10:00, an attack within 6 minutes after', () => {
    hits.length = 0;
    const spies = [
      ['wave', vi.spyOn(ArmyControl.prototype, 'launchWave')],
      ['harass', vi.spyOn(HarassControl.prototype, 'launch')],
      ['flank', vi.spyOn(FlankControl.prototype, 'launch')],
      ['landing', vi.spyOn(LandingControl.prototype, 'start')],
    ] as const;
    try {
      const match = createHeadlessMatch({
        seed: SEED,
        size: 64,
        template: 'meadow',
        aiCount: 1,
        treatyMin: 10,
        civs: { human: 'hungarian', ais: ['english'] },
        strategy: () => new HardStrategy(createRng(SEED * 31 + 2)),
        difficulty: () => 'hard',
        humanStrategy: new HardStrategy(createRng(SEED * 31 + 1)),
        humanEnemy: () => 2,
        enemyOf: () => 1,
      });
      clock.now = match.timeMs;
      match.run(TREATY_MS + 6 * MIN, 100);
      const real = hits.filter((h) => h.killer !== null && h.killer !== 0 && h.victim !== 0 && h.killer !== h.victim);
      expect(real.filter((h) => h.atMs < TREATY_MS), 'damage between players during the treaty').toEqual([]);
      const launches = spies
        .flatMap(([what, spy]) => spy.mock.calls.map((args) => ({ what, atMs: (args[0] as AIContext).timeMs })))
        .sort((a, b) => a.atMs - b.atMs);
      expect(launches.filter((l) => l.atMs < TREATY_MS), 'offensive launches during the treaty').toEqual([]);
      const first = real[0];
      const firstOnBuilding = real.find((h) => h.building);
      if (process.env['PRINT_SIM']) {
        const min = (ms: number | undefined) => (ms === undefined ? 'none' : (ms / MIN).toFixed(2));
        console.log(
          `treaty seed ${SEED}: first launch ${launches[0]?.what ?? ''} ${min(launches[0]?.atMs)}, first hit ${min(first?.atMs)} (by ${first?.killer}), ` +
            `first building hit ${min(firstOnBuilding?.atMs)}, hits ${real.length}`,
        );
      }
      // The AIs go right after the end, and the attack lands: damage to the other player within 6 minutes.
      expect(launches.length, 'a wave or raid launched after the treaty').toBeGreaterThan(0);
      expect(first, 'an attack within 6 minutes after the treaty').toBeDefined();
      expect(first!.atMs).toBeLessThanOrEqual(TREATY_MS + 6 * MIN);
    } finally {
      for (const [, spy] of spies) spy.mockRestore();
    }
  });
});
