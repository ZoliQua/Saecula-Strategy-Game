import { describe, expect, it, vi } from 'vitest';
import { createRng } from '../../map/random';
import { createHeadlessMatch, type HeadlessMatch } from '../testing/headlessMatch';
import { MediumStrategy } from './MediumStrategy';

const MIN = 60_000;

/** Every paid trade leg (TradeSystem → tradeGoldPerTrip on an armed arrival): the cart's owner, the target's owner, the gold. */
const legs = vi.hoisted(() => [] as { owner: number; targetOwner: number | undefined; gold: number }[]);
vi.mock('../../game/trade', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../game/trade')>();
  return {
    ...actual,
    tradeGoldPerTrip: (...args: Parameters<typeof actual.tradeGoldPerTrip>) => {
      const gold = actual.tradeGoldPerTrip(...args);
      const [, target, ownerId] = args;
      legs.push({ owner: ownerId, targetOwner: target.owner?.playerId, gold });
      return gold;
    },
  };
});

/** When each player's finished market and landmark first stood (game ms). */
function watchBuilt(match: HeadlessMatch, ids: readonly number[]) {
  const built = new Map<string, number>();
  const note = (t: number) => {
    for (const e of match.world.entities) {
      const type = e.building?.type;
      const owner = e.owner?.playerId;
      if ((type !== 'market' && type !== 'landmark') || owner === undefined || !ids.includes(owner) || e.underConstruction || e.dying) continue;
      const key = `${owner}:${type}`;
      if (!built.has(key)) built.set(key, t);
    }
  };
  return { built, note };
}

/**
 * M17 "AI (Közepestől)" without a browser.
 * (1) 96×96 meadow, Medium (player 2, German) against an AI-driven Medium
 * human slot (English), 40 game minutes: the AI builds a market and its
 * landmark (Hanza-kontor). A head-on Medium duel is decided by the opening
 * raids, so only the side left standing reaches age 2. Seed sweep 1-8 (same
 * civs and RNGs): the AI builds both with 1, 2, 4, 5 and 6 (market at
 * 18.9-19.7 min, landmark at 22.3-26.0 min); with 8 the human slot wins
 * and builds both (20.8 / 24.8 min); with 3 and 7 the raids leave neither
 * side a villager and nobody reaches age 2. With a 20-minute treaty both
 * build a market on every seed. 1 is kept: market 18.9, landmark 22.7 min.
 * (2) 2v2 with allies 1 (team 1: the AI-driven human 1 and AI 2), Medium,
 * the teams.sim setup: the ally runs trade carts toward the human slot's
 * market (which that AI-driven slot builds) and earns gold from them.
 * Seed sweep (3, 5, 7, 11, 19, 23): passes with 3 and 11 (both team-1
 * markets by 21.4 / 22.9 min; carts both ways; over the full 40 minutes the
 * ally's carts paid 55 legs / 990 gold with 3, 61 / 915 with 11, routed every upkeep); with 7 and 19
 * the human slot falls before it builds a market (the ally builds its own),
 * with 5 and 23 team 2 wins early (with 23 its two AIs trade with each
 * other: 3 carts each). Since idle carts are routed at the decision cadence
 * (not every upkeep), seed 3's ally makes its second paid leg only at 39.4
 * min (4 legs / 72 gold in 40 min), so 11 is kept: markets at 18.75 (ally)
 * and 22.9 min, the ally's second paid leg by 29.4 min, 64 legs / 960 gold
 * over the full 40 minutes; about 9 s.
 */
describe('trade (M17): the Medium AI builds markets and landmarks, and trades with allies', () => {
  it('builds a market and its landmark within 40 minutes on a 96×96 meadow', () => {
    const match = createHeadlessMatch({
      seed: 1,
      size: 96,
      aiCount: 1,
      civs: { human: 'english', ais: ['german'] },
      strategy: (id) => new MediumStrategy(createRng(10 + id)),
      difficulty: () => 'medium',
      humanStrategy: new MediumStrategy(createRng(5)),
    });
    const { built, note } = watchBuilt(match, [2]);
    match.run(40 * MIN, 100, (t) => {
      if (t % 5000 < 100) note(t);
      return built.has('2:market') && built.has('2:landmark');
    });
    note(match.timeMs());
    expect(built.has('2:market'), 'the AI builds a market').toBe(true);
    expect(built.has('2:landmark'), 'the AI builds its landmark').toBe(true);
    // One landmark each, ever (UNIQUE_BUILDINGS).
    for (const id of [1, 2]) {
      expect(match.world.entities.filter((e) => e.building?.type === 'landmark' && e.owner?.playerId === id).length).toBeLessThanOrEqual(1);
    }
  });

  it("in a 2v2 the allied AI runs trade carts to the human slot's market and earns gold", () => {
    legs.length = 0;
    const match = createHeadlessMatch({
      seed: 11,
      size: 96,
      aiCount: 3,
      allies: 1,
      civs: { human: 'hungarian', ais: ['english', 'german', 'french'] },
      strategy: (id) => new MediumStrategy(createRng(10 + id)),
      difficulty: () => 'medium',
      humanStrategy: new MediumStrategy(createRng(5)),
    });
    const { built, note } = watchBuilt(match, [1, 2]);
    const allyGold = () => legs.filter((l) => l.owner === 2 && l.targetOwner === 1).reduce((s, l) => s + l.gold, 0);
    match.run(40 * MIN, 100, (t) => {
      if (t % 5000 < 100) note(t);
      return allyGold() > 0 && legs.filter((l) => l.owner === 2).length >= 2;
    });
    expect(built.has('1:market'), 'the AI-driven human slot builds a market').toBe(true);
    expect(built.has('2:market'), 'the ally builds a market').toBe(true);
    // Toward the ally's market only (never another team's), and it pays.
    expect(legs.filter((l) => l.owner === 2).every((l) => l.targetOwner === 1 || l.targetOwner === 2)).toBe(true);
    expect(allyGold(), "gold from legs to the human slot's market").toBeGreaterThan(0);
  });
});
