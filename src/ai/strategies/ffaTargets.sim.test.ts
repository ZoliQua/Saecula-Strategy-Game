import { describe, expect, it } from 'vitest';
import type { VictoryMode } from '../../game/GameSetupConfig';
import { createRng } from '../../map/random';
import { aiRngSeed, createStrategy } from '../createStrategy';
import { createHeadlessMatch, type HeadlessMatch } from '../testing/headlessMatch';

const MIN = 60_000;

interface Outcome {
  /** Game ms of the first attack order of one AI against another AI's unit or building (Infinity: none). */
  readonly firstAiVsAi: number;
  /** Attack-order seconds (AI units, sampled each game second) aimed at the human's entities / at other AIs'. */
  readonly onHuman: number;
  readonly onAis: number;
  /** Game ms at which the human slot's king fell (Infinity: it lived). */
  readonly humanKingFell: number;
}

/** 6 players (human slot driven by an AI too), Hard, free-for-all. `old` pins the pre-M23 targeting (everyone attacks player 1, the human attacks 2, waves fight only their target's units). */
function play(victory: VictoryMode, seed: number, old: boolean, limit: number): Outcome {
  const strategy = (id: number) => createStrategy('hard', createRng(aiRngSeed(seed, id)));
  const m: HeadlessMatch = createHeadlessMatch({
    seed, size: 64, template: 'meadow', aiCount: 5, victory,
    strategy, difficulty: () => 'hard', humanStrategy: strategy(1),
    ...(old ? { enemyOf: () => 1, humanEnemy: () => 2, freeForAll: false } : {}),
  });
  const king = m.world.entities.find((e) => e.unit?.unitType === 'king' && e.owner?.playerId === 1);
  const ownerOf = new Map<number, number>();
  let onHuman = 0;
  let onAis = 0;
  let firstAiVsAi = Infinity;
  let humanKingFell = Infinity;
  m.run(limit, 100, (t) => {
    if (t % 1000) return;
    for (const e of m.world.entities) if (e.id !== undefined && e.owner) ownerOf.set(e.id, e.owner.playerId);
    for (const e of m.world.entities) {
      if (!e.unit || !e.attackIntent || !e.owner || e.owner.playerId < 2) continue;
      const target = ownerOf.get(e.attackIntent.targetId);
      if (target === 1) onHuman++;
      if (target === undefined || target < 2 || target === e.owner.playerId) continue;
      onAis++;
      firstAiVsAi = Math.min(firstAiVsAi, t);
    }
    if (king && humanKingFell === Infinity && (king.dying || !m.world.entities.includes(king))) humanKingFell = t;
    return m.judge().kind !== 'playing';
  });
  return { firstAiVsAi, onHuman, onAis, humanKingFell };
}

/**
 * M23: in free-for-all Regicide every AI picks its nearest standing enemy (chooseEnemyPlayer
 * `nearest`) instead of all five raiding the human slot. 64x64 meadow, 6 players, Hard, the human slot
 * driven by a Hard AI, 20 game minutes, measured before the change by pinning the old targeting
 * (`old`: AIs -> 1, human -> 2, waves fight only their target's units): seed 7: the human's king
 * fell at 332 s before, lives after (attack-order seconds on the human 401 -> 2404, on other AIs
 * 534 -> 12895; with waves that fight every enemy on the way, final review fix). Seed 3 (outside the
 * suite): the king lived both ways (hill seeds 3 and 7 likewise, aimed-at-human seconds 327/342 -> 330/373).
 */
describe('free-for-all Regicide, 6 players', () => {
  it('the AIs fight each other and the human king outlives the old all-on-the-human raids', () => {
    const before = play('regicide', 7, true, 20 * MIN);
    const after = play('regicide', 7, false, 20 * MIN);
    expect(before.humanKingFell).toBeLessThan(10 * MIN);
    expect(after.humanKingFell).toBeGreaterThan(before.humanKingFell);
    expect(after.onAis).toBeGreaterThan(before.onAis);
  }, 300_000);
});
