import { describe, expect, it } from 'vitest';
import { AI_HARD } from '../../config/aiBalance';
import { createRng } from '../../map/random';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { HardStrategy } from './HardStrategy';

const MIN = 60_000;
const SIM_TIMEOUT_MS = 300_000;

/*
 * M15: the Hard water opening. The opening raid's hold stops villager
 * training at about 9 villagers, so a dock that waited for more villagers
 * (navy.minVillagers 10 before M15) went up only after the raids, and the
 * game was decided by who happened to have one (CLAUDE.md, 0.9.2 note).
 * Both Hard players on a 96×96 Beltenger found their dock within a minute of
 * the latest first-attack time. Measured (French vs German, 12 min): before
 * M15 seed 3 had no dock, seed 7 one, seed 19 one at 7.0 min; after it every
 * dock went up by 5.1 min. (Seed 11's second player finds none either way.)
 */
const DOCK_BY_MS = AI_HARD.firstAttackMs.max + MIN;
describe('Hard water opening (M15)', () => {
  it.each([3, 7, 19])(
    'seed %i: both Hard players found a dock within a minute of the latest opening raid',
    (seed) => {
      const match = createHeadlessMatch({
        seed,
        size: 96,
        template: 'inland_sea',
        aiCount: 1,
        civs: { human: 'french', ais: ['german'] },
        strategy: () => new HardStrategy(createRng(seed * 31 + 2)),
        difficulty: () => 'hard',
        humanStrategy: new HardStrategy(createRng(seed * 31 + 1)),
      });
      const docked = new Map<number, number>();
      match.run(DOCK_BY_MS, 250, (t) => {
        for (const e of match.world.entities) {
          const id = e.owner?.playerId;
          if (e.building?.type === 'dock' && id !== undefined && !docked.has(id)) docked.set(id, t);
        }
        return docked.size === 2 ? true : undefined;
      });
      expect([...docked.keys()].sort(), `dock founders by ${DOCK_BY_MS / MIN} min: ${JSON.stringify([...docked])}`).toEqual([1, 2]);
          },
    SIM_TIMEOUT_MS,
  );
});
