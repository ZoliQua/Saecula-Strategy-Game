import { beforeAll, describe, expect, it } from 'vitest';
import { CIV_IDS } from '../../config/civs';
import type { AgeId } from '../../types';
import { occludedGlows } from './testing/occludedGlows.testkit';
import { PIN_TEAM } from './testing/pinnedArt.testkit';
import { hashPainting, installRecordingCanvas, type RecordedCanvas } from './testing/recordingCanvas.testkit';

/*
 * M17 art: the shared market paints for every civ and age, the same way
 * twice (deterministic), takes each age's own style, and hides no lit
 * window behind a later face (stalls, crates, roof). As for M11 and M14,
 * no hash is pinned (draw-log hashes differ between Node versions).
 */

const AGES: readonly AgeId[] = [1, 2, 3];
const drawCalls = (canvas: HTMLCanvasElement): number => (canvas as unknown as RecordedCanvas).log.length;

describe('market art', () => {
  let buildings: typeof import('./buildings');
  beforeAll(async () => {
    installRecordingCanvas();
    buildings = await import('./buildings');
  });

  it.each(CIV_IDS)('%s: the market paints in every age, deterministically, in a 3-tile footprint', (civ) => {
    const hashes = new Set<string>();
    for (const age of AGES) {
      const art = buildings.paintBuilding('market', PIN_TEAM, age, civ, false);
      expect(drawCalls(art.canvas), `market@${age}`).toBeGreaterThan(80);
      expect(art.glows.length, `market@${age}`).toBeGreaterThan(0);
      const once = hashPainting(() => buildings.paintBuilding('market', PIN_TEAM, age, civ, false));
      expect(hashPainting(() => buildings.paintBuilding('market', PIN_TEAM, age, civ, false))).toBe(once);
      hashes.add(once);
    }
    expect(buildings.BUILDING_ART_SIZES.market).toBe(3);
    // Ages 2 and 3 use different styles for every civ but the Finns (one nordic style).
    expect(hashes.size).toBeGreaterThanOrEqual(civ === 'finnish' ? 1 : 2);
  });

  it.each(CIV_IDS)('%s: no lit market window is hidden behind a later face', (civ) => {
    for (const age of AGES) {
      expect(occludedGlows(() => buildings.paintBuilding('market', PIN_TEAM, age, civ, false)), `market@${age}`).toEqual([]);
    }
  });

  it('the team colour shows (one awning flies it): two teams paint differently', () => {
    const a = hashPainting(() => buildings.paintBuilding('market', PIN_TEAM, 2, 'english', false));
    const b = hashPainting(() => buildings.paintBuilding('market', 0xd04a4a, 2, 'english', false));
    expect(a).not.toBe(b);
  });
});
