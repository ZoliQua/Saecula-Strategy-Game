import { describe, expect, it, vi } from 'vitest';
import { areAllies } from '../../game/diplomacy';
import { createRng } from '../../map/random';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { MediumStrategy } from './MediumStrategy';

const MIN = 60_000;

/** Every hit in the match (all damage goes through game/kill's applyDamage): who dealt it to whom. */
const hits = vi.hoisted(() => [] as { killer: number | null; victim: number; amount: number; building: boolean }[]);
vi.mock('../../game/kill', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../game/kill')>();
  return {
    ...actual,
    applyDamage: (...args: Parameters<typeof actual.applyDamage>) => {
      const [, target, amount, killer] = args;
      if (!target.dying) hits.push({ killer: killer ?? null, victim: target.owner?.playerId ?? 0, amount, building: target.building !== undefined });
      return actual.applyDamage(...args);
    },
  };
});

/**
 * M16 teams without a browser: 96×96 meadow, four Medium players, `allies: 1`
 * (team 1 = the AI-driven human 1 and its ally 2; team 2 = AIs 3 and 4). No
 * `enemyOf`/`humanEnemy`: every AI (and the human slot) picks its enemy with
 * chooseEnemyPlayer, as SystemRunner does. Pins that the ally's units hurt an
 * enemy-team AI (the ally attacks the enemy team, not the human), that the
 * match is decided for one team or both teams lose buildings to the other
 * within 40 game minutes, and that no hit ever lands between allies. The
 * ally must hit enemy-team *buildings*: home defence alone never does, so
 * this fails when the ally still targets the human (checked: with every AI's
 * enemy forced back to player 1 the ally lands 188 hits on enemy units while
 * defending, and none on a building).
 * Seed sweep (3, 5, 7, 11, 19, 23; same civs and RNGs): every check passes
 * with 3, 7, 11 and 19 (team 1 wins at 27.4, 21.1 and 28.0 min; with 19
 * team 2 wins at 32.8 min, after 1217 ally hits on enemy buildings). With 5 and 23 team 2 wins (22.2 and 31.1 min) before an ally
 * wave reaches an enemy building: its waves (8 and 18 min with 23) are beaten
 * in the field, so only the building check fails; no seed ever has a hit
 * between allies. With 3: decided at 27.39 min, the ally lands 1796 hits on
 * the enemy team (1660 on buildings); about 16 s.
 */
describe('teams (M16): 2v2 Medium on a 96×96 meadow, allies 1', () => {
  it('the ally fights the enemy team and no damage is ever dealt between allies', () => {
    hits.length = 0;
    const match = createHeadlessMatch({
      seed: 3,
      size: 96,
      aiCount: 3,
      allies: 1,
      civs: { human: 'hungarian', ais: ['english', 'german', 'french'] },
      strategy: (id) => new MediumStrategy(createRng(10 + id)),
      difficulty: () => 'medium',
      humanStrategy: new MediumStrategy(createRng(5)),
    });
    const { players, world } = match;
    expect(players.all().map((p) => p.team)).toEqual([1, 1, 2, 2]);
    const standing = (id: number) =>
      world.entities.some((e) => e.building?.type === 'town_center' && e.owner?.playerId === id && !e.dying);
    const teamDown = (ids: number[]) => ids.every((id) => !standing(id));
    let decidedAt = Infinity;
    match.run(40 * MIN, 100, (t) => {
      if (teamDown([1, 2]) || teamDown([3, 4])) {
        decidedAt = t;
        return true;
      }
      return false;
    });
    const real = hits.filter((h) => h.killer !== null && h.killer !== 0 && h.victim !== 0);
    const allied = real.filter((h) => areAllies(players, h.killer!, h.victim));
    expect(allied, 'hits between allies').toEqual([]);
    const allyOnEnemy = real.filter((h) => h.killer === 2 && (h.victim === 3 || h.victim === 4));
    // Buildings: the ally's waves go to the enemy team's bases (home defence alone never hits a building).
    const allyOnEnemyBuildings = allyOnEnemy.filter((h) => h.building).length;
    expect(allyOnEnemy.length, 'the ally hits an enemy-team AI').toBeGreaterThan(0);
    expect(allyOnEnemyBuildings, "the ally hits the enemy team's buildings").toBeGreaterThan(0);
    const buildingsLost = (byTeam: number[], ofTeam: number[]) =>
      real.some((h) => h.building && byTeam.includes(h.killer!) && ofTeam.includes(h.victim));
    const decided = decidedAt < Infinity;
    expect(decided || (buildingsLost([1, 2], [3, 4]) && buildingsLost([3, 4], [1, 2])), 'decided, or both teams hit').toBe(true);
    console.log(
      `teams sim: decided ${decided ? `at ${(decidedAt / MIN).toFixed(2)} min` : 'no'}; ` +
        `hits ally→enemy ${allyOnEnemy.length} (buildings ${allyOnEnemyBuildings}), total ${real.length}; standing ${[1, 2, 3, 4].map((id) => `${id}:${standing(id)}`).join(' ')}`,
    );
  });
});
