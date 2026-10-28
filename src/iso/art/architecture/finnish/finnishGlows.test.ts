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
 * window in the Finnish art, not even one an eave grazes. The types
 * tested are every building type whose Finnish art records a glow in
 * some age (Task 13 re-review N1), not a fixed list.
 */

const TEAM = 0x3b6fd6;
const ALL_TYPES = Object.keys(BUILDING_BALANCE) as BuildingType[];
const AGES = [1, 2, 3] as const satisfies readonly AgeId[];
/** Types known to glow (town centre, houses, smithy, foundry, Wonder): the derived list must keep them. */
const KNOWN_GLOWING: readonly BuildingType[] = ['town_center', 'house', 'blacksmith', 'foundry', 'wonder'];

describe('Finnish glows show (no lit window behind a later solid)', () => {
  beforeAll(() => installRecordingCanvas());

  it('derives the glowing types from the art', () => {
    const glowing = ALL_TYPES.filter((type) => AGES.some((age) => paintBuilding(type, TEAM, age, 'finnish', false).glows.length > 0));
    expect(glowing).toEqual(expect.arrayContaining([...KNOWN_GLOWING]));
  });

  it.each(AGES)('age %s: no glowing type hides a lit window behind a later solid', (age) => {
    for (const type of ALL_TYPES) {
      if (paintBuilding(type, TEAM, age, 'finnish', false).glows.length === 0) continue;
      expect(occludedGlows(() => paintBuilding(type, TEAM, age, 'finnish', false)), `${type}@${age}`).toEqual([]);
    }
  });

  it.each([1, 2, 3] as const)('Wonder stage %s hides no lit window', (stage) => {
    expect(occludedGlows(() => paintWonderStage(stage, 'finnish'))).toEqual([]);
  });
});
