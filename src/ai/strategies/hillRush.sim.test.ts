import { describe, expect, it } from 'vitest';
import { missionSetup } from '../../campaign/missions';
import { createRng } from '../../map/random';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { HardStrategy } from './HardStrategy';
import { MediumStrategy } from './MediumStrategy';

const MIN = 60_000;

/*
 * M23: hill_rush must be winnable for an experienced player. A Hard AI in the
 * human slot with the mission's fixed setup (map seed 7707, start bonus 400 /
 * 400 / 300, opponent: one Medium AI on RNG `id * 13 + rs`, human Hard AI on RNG
 * `rs`) won 9 of 16 AI seeds (rs 1..16), every win and loss by the hill, at
 * 20.8-29.0 minutes. Winning seeds: 1, 2, 3, 4, 6, 10, 11, 14, 15. At least half,
 * so the start bonus stays unchanged. Pinned: five winning seeds (seed 6 also won in the first sweep but flipped to a loss once the uncommitted FFA targeting work was in the tree, so it is not pinned: single seeds are fragile, the half-of-16 rate is the measure).
 */
describe('hill rush winnability (M23)', () => {
  it.each([1, 3, 10, 11, 14])('a Hard player wins by the hill on AI seed %i', (rs) => {
    const s = missionSetup('hill_rush');
    const m = createHeadlessMatch({ mission: 'hill_rush', seed: s.seed, size: 64, aiCount: 1, strategy: (id) => new MediumStrategy(createRng(id * 13 + rs)), difficulty: () => s.difficulty, humanStrategy: new HardStrategy(createRng(rs)) });
    m.run(40 * MIN, 100, (t) => (Math.round(t) % 1000 === 0 ? m.judge().kind !== 'playing' : undefined));
    expect(m.judge()).toMatchObject({ kind: 'victory', winnerId: 1, cause: 'hill' });
  }, 300_000);
});
