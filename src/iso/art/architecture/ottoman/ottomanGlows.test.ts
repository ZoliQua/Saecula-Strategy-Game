import { beforeAll, describe, expect, it } from 'vitest';
import { BUILDING_BALANCE } from '../../../../config/balance';
import type { AgeId, BuildingType } from '../../../../types';
import { paintBuilding, paintWonderStage } from '../../buildings';
import { occludedGlows } from '../../testing/occludedGlows.testkit';
import { installRecordingCanvas } from '../../testing/recordingCanvas.testkit';

/*
 * Occluded glows (Task 13 review I1 / m8): a lit window that a later
 * solid paints over still glows at dusk, floating on the wall or roof in
 * front of it. The checker (testing/occludedGlows.testkit.ts, promoted
 * from this file for every civ in allCivsGlows.test.ts) finds no such
 * window in the Ottoman art hidden at its centre or over half covered
 * (those the style's dropHiddenGlows removes). Windows a later face only
 * grazes keep their glow, as in allCivsGlows.test.ts; the ceilings below
 * hold them. The only one is inherited from the shared foundry (always
 * painted in the age-3 style): its front light, ~29 % covered by its
 * furnace (the same graze Polish carries). allCivsGlows'
 * GRAZED_CEILINGS holds the same ceilings since Ottoman became available
 * (M21 Task 5). The types
 * tested are every building type whose Ottoman art records a glow in some
 * age, not a fixed list.
 */

/** Grazed windows (centre visible, under half covered) by building and age; everything else has none. */
const GRAZED: Readonly<Record<string, number>> = { 'foundry@1': 1, 'foundry@2': 1, 'foundry@3': 1 };

function expectNoneHidden(key: string, hits: ReturnType<typeof occludedGlows>): void {
  expect(hits.length, key).toBeLessThanOrEqual(GRAZED[key] ?? 0);
  for (const h of hits) {
    expect(h.centre, `${key} glow ${h.index}`).toBe(false);
    expect(h.coverage, `${key} glow ${h.index}`).toBeLessThan(0.5);
  }
}

const TEAM = 0x3b6fd6;
const ALL_TYPES = Object.keys(BUILDING_BALANCE) as BuildingType[];
const AGES = [1, 2, 3] as const satisfies readonly AgeId[];
/** Types known to glow (town centre, houses, smithy, foundry, Wonder): the derived list must keep them. */
const KNOWN_GLOWING: readonly BuildingType[] = ['town_center', 'house', 'blacksmith', 'wonder', 'landmark'];

describe('Ottoman glows show (no lit window hidden behind a later solid)', () => {
  beforeAll(() => installRecordingCanvas());

  it('derives the glowing types from the art', () => {
    const glowing = ALL_TYPES.filter((type) => AGES.some((age) => paintBuilding(type, TEAM, age, 'ottoman', false).glows.length > 0));
    expect(glowing).toEqual(expect.arrayContaining([...KNOWN_GLOWING]));
  });

  it.each(AGES)('age %s: no glowing type hides a lit window behind a later solid', (age) => {
    for (const type of ALL_TYPES) {
      if (paintBuilding(type, TEAM, age, 'ottoman', false).glows.length === 0) continue;
      expectNoneHidden(`${type}@${age}`, occludedGlows(() => paintBuilding(type, TEAM, age, 'ottoman', false)));
    }
  });

  it.each([1, 2, 3] as const)('Wonder stage %s hides no lit window', (stage) => {
    expect(occludedGlows(() => paintWonderStage(stage, 'ottoman'))).toEqual([]);
  });
});
