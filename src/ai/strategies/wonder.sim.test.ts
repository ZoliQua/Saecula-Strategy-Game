import { describe, expect, it } from 'vitest';
import type { Entity } from '../../ecs/components';
import { createRng } from '../../map/random';
import { createHeadlessMatch, type HeadlessMatch } from '../testing/headlessMatch';
import { HardStrategy } from './HardStrategy';

const MIN = 60_000;
const SIM_TIMEOUT_MS = 240_000;
/** Measured 26.79 min (age 3 at 19.07 min, then saving 2000/2000/1000); pinned at +15 %. */
const PLACED_BY_MS = 26.79 * 1.15 * MIN;

/** Hard alone (vs the passive human) on a 64×64 meadow, seed 2. */
function hardAlone(wonderVictory: boolean): HeadlessMatch {
  return createHeadlessMatch({
    seed: 2,
    size: 64,
    aiCount: 1,
    strategy: () => new HardStrategy(createRng(2 * 31 + 2)),
    difficulty: () => 'hard',
    wonderVictory,
  });
}

const hasWonder = (m: HeadlessMatch) => m.world.entities.some((e) => e.building?.type === 'wonder' && e.owner?.playerId === 2);
const isMilitary = (e: Entity) => e.owner?.playerId === 2 && !!e.unit && e.unit.unitType !== 'villager' && e.id !== undefined;

/** Game time the Wonder site went down (Infinity: none within `minutes`). */
function wonderPlacedAt(wonderVictory: boolean, minutes = 40): { at: number; age: number } {
  const match = hardAlone(wonderVictory);
  let at = Infinity;
  match.run(minutes * MIN, 100, (t) => {
    if (!hasWonder(match)) return;
    at = t;
    return true;
  });
  return { at, age: match.players.get(2)!.age };
}

/**
 * Military units Hard trains in the `windowMin` minutes after `from`
 * happens (age 3, or its Wonder site going down). With `drainGold`, every
 * gold node and Hard's gold are emptied on reaching age 3: the Wonder's
 * cost can no longer be gathered.
 */
function militaryAfter(
  wonderVictory: boolean,
  from: 'age3' | 'wonder',
  windowMin: number,
  drainGold = false,
): { trained: number; startedAt: number } {
  const match = hardAlone(wonderVictory);
  const hard = match.players.get(2)!;
  const seen = new Set<number>();
  let startedAt = Infinity;
  let trained = 0;
  match.run(45 * MIN, 100, (t) => {
    if (startedAt === Infinity && hard.age === 3 && from === 'age3') {
      startedAt = t;
      if (drainGold) {
        for (const e of match.world.entities) if (e.resourceNode?.type === 'gold') e.resourceNode.amount = 0;
        hard.resources = { ...hard.resources, gold: 0 };
      }
    }
    if (startedAt === Infinity && from === 'wonder' && hasWonder(match)) startedAt = t;
    for (const e of match.world.entities) {
      if (!isMilitary(e) || seen.has(e.id!)) continue;
      seen.add(e.id!);
      if (t > startedAt) trained++;
    }
    return t > startedAt + windowMin * MIN;
  });
  return { trained, startedAt };
}

describe('AI Wonder play (64×64 meadow, seed 2, Hard alone)', () => {
  it('places a Wonder site within 40 min when the Wonder can win', () => {
    const r = wonderPlacedAt(true);
    expect(r.age).toBe(3);
    expect(r.at).toBeLessThan(40 * MIN);
    expect(r.at).toBeLessThan(PLACED_BY_MS);
  }, SIM_TIMEOUT_MS);

  it('places none in conquest-only mode', () => {
    expect(wonderPlacedAt(false).at).toBe(Infinity);
  }, SIM_TIMEOUT_MS);

  /**
   * Measured: 30 military units in the 10 min after age 3, the same as in
   * conquest-only mode; without the gatherable-cost guard (Wonder saving
   * forever) only 14, with food piling up past 2000.
   */
  it('default mode, gold gone at age 3: no endless Wonder saving, the army keeps training as in conquest-only', () => {
    const wonder = militaryAfter(true, 'age3', 10, true);
    const conquest = militaryAfter(false, 'age3', 10, true);
    expect(wonder.startedAt).toBeLessThan(40 * MIN);
    expect(wonder.trained).toBe(conquest.trained);
    expect(wonder.trained).toBeGreaterThanOrEqual(Math.floor(30 * 0.85));
  }, SIM_TIMEOUT_MS);

  /** Measured: 51 military units in the 10 min after the site went down (pinned at -15 %). */
  it('default mode: once the Wonder is placed, the age-3 army trains again', () => {
    const r = militaryAfter(true, 'wonder', 10);
    expect(r.startedAt).toBeLessThan(PLACED_BY_MS);
    expect(r.trained).toBeGreaterThanOrEqual(Math.floor(51 * 0.85));
  }, SIM_TIMEOUT_MS);
});
