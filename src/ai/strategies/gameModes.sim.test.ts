import { describe, expect, it } from 'vitest';
import { AI_EASY, AI_KING } from '../../config/aiBalance';
import type { Difficulty, VictoryMode } from '../../game/GameSetupConfig';
import { hillState } from '../../game/hill';
import { distanceToFootprint } from '../../game/landmarks';
import type { MapTemplate } from '../../map/generator';
import { createRng } from '../../map/random';
import { clearUnitOrders } from '../../ecs/orders';
import { chebyshev } from '../../iso/coordinates';
import type { AIStrategy } from '../AIPlayer';
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
 * other headless sims), 64×64, seeds 1, 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31 outside the suite
 * (winner, cause and minute in .superpowers/sdd/2026-12-02-m19-game-modes/task-5-report.md).
 * King of the Hill: every match decided within 60 game minutes, medians 14.4 min (meadow), 14.4
 * (wilderness), 14.1 (fortress). Regicide, since the AI defends its king against scouts (villagers
 * when the home army is short) and flees toward its town centre (fix round 1): medians 19.7 min
 * (meadow, 14.3–28.1), 19.4 (fortress, 13.3–23.1), none before minute 10; archipelago 22.2, 11 of
 * 12 decided (seed 5 still open at 60 min). Before it the opening scout raid killed the king at
 * minute 6.2 (meadow) and 6.5 (fortress), every seed before minute 10. Kept here: one seed per map.
 */
describe('Hard v Hard: each mode is decided within 60 game minutes', () => {
  it.each([
    // In the sweep: decided at 14.4, 20.9, 21.3, 20.3, 20.7 and 19.2 min.
    ['hill', 'meadow', 3],
    ['hill', 'wilderness', 7],
    ['hill', 'fortress', 19],
    ['regicide', 'meadow', 13],
    ['regicide', 'fortress', 7],
    ['regicide', 'archipelago', 7],
  ] as const)('%s on %s, seed %i', (victory, template, seed) => {
    const m = duel(victory, template, seed, 'hard');
    m.run(60 * MIN, 100, () => m.judge().kind !== 'playing');
    expect(m.judge()).toMatchObject({ cause: victory });
    expect(m.timeMs()).toBeLessThanOrEqual(60 * MIN);
    // The opening raid no longer decides Regicide.
    if (victory === 'regicide') expect(m.timeMs()).toBeGreaterThan(10 * MIN);
  });
});

/**
 * What a human does at the least: the human slot stands idle except that it sends every villager at
 * the enemy units that come within 8 tiles of its king. Against a Hard AI on the 64×64 meadow, seeds
 * 1–31 as above and the fortress likewise, the opening raid reached the king at minute 4.7–5.2 and
 * left it with 96–142 of its 150 HP (it fell to a later wave, at minute 11.3–15, as nobody trains an
 * army). Kept here: meadow seed 3 (first hit at 4.9 min, 134 HP left).
 */
describe('Regicide: a human who pulls villagers onto the raiders', () => {
  const guardOnly = (): AIStrategy => ({
    name: 'villager-guard',
    snapshot: () => ({ kind: 'null' }),
    restore: () => undefined,
    update(ctx) {
      const me = ctx.player.id;
      const king = ctx.world.entities.find((e) => e.unit?.unitType === 'king' && e.owner?.playerId === me && !e.dying);
      if (!king?.position) return;
      const raiders = ctx.world.entities.filter((e) => e.unit && e.attacker && e.position && !e.dying && e.owner && e.owner.playerId !== me && chebyshev(e.position, king.position!) <= 8);
      for (const v of ctx.world.entities) {
        if (v.unit?.unitType !== 'villager' || v.owner?.playerId !== me || v.dying || !v.position) continue;
        if (raiders.length === 0 || (v.attackIntent && raiders.some((r) => r.id === v.attackIntent!.targetId))) continue;
        const nearestRaider = [...raiders].sort((a, b) => chebyshev(a.position!, v.position!) - chebyshev(b.position!, v.position!))[0]!;
        clearUnitOrders(ctx.world, v);
        ctx.world.addComponent(v, 'attackIntent', { targetId: nearestRaider.id! });
      }
    },
  });

  it('keeps its king through the opening raid', () => {
    const seed = 3;
    const m = createHeadlessMatch({
      seed, size: 64, template: 'meadow', aiCount: 1, victory: 'regicide',
      strategy: (id) => createStrategy('hard', createRng(aiRngSeed(seed, id))), difficulty: () => 'hard', humanStrategy: guardOnly(),
    });
    const king = m.world.entities.find((e) => e.unit?.unitType === 'king' && e.owner?.playerId === 1)!;
    m.run(9 * MIN, 100);
    expect(king.dying).toBeFalsy();
    expect(king.health!.current).toBeLessThan(king.health!.max);
    expect(m.judge()).toEqual({ kind: 'playing' });
  });
});
