import { beforeAll, describe, expect, it } from 'vitest';
import { CIV_IDS } from '../../config/civs';
import type { AgeId } from '../../types';
import { occludedGlows } from './testing/occludedGlows.testkit';
import { PIN_TEAM } from './testing/pinnedArt.testkit';
import { hashPainting, installRecordingCanvas, type RecordedCanvas } from './testing/recordingCanvas.testkit';

/*
 * M17 art plumbing: every civ paints a landmark in each of its age styles
 * (LANDMARK_ART, each civ its own painter), the same way twice, in a 3-tile footprint, hiding no lit window.
 * No hash is pinned (draw-log hashes differ between Node versions).
 */

const AGES: readonly AgeId[] = [1, 2, 3];
const drawCalls = (canvas: HTMLCanvasElement): number => (canvas as unknown as RecordedCanvas).log.length;

describe('landmark art', () => {
  let buildings: typeof import('./buildings');
  let registry: typeof import('./architecture/registry');
  beforeAll(async () => {
    installRecordingCanvas();
    buildings = await import('./buildings');
    registry = await import('./architecture/registry');
  });

  it('every civ has a landmark painter, in each of its age styles', () => {
    expect(Object.keys(registry.LANDMARK_ART).sort()).toEqual([...CIV_IDS].sort());
    expect(buildings.BUILDING_ART_SIZES.landmark).toBe(3);
  });

  it('every civ has its own landmark painter (no shared placeholder)', () => {
    expect(new Set(Object.values(registry.LANDMARK_ART)).size).toBe(CIV_IDS.length);
  });

  it.each(CIV_IDS)('%s: the landmark paints in every age, deterministically, in a 3-tile footprint', (civ) => {
    for (const age of AGES) {
      const art = buildings.paintBuilding('landmark', PIN_TEAM, age, civ, false);
      expect(drawCalls(art.canvas), `landmark@${age}`).toBeGreaterThan(40);
      const once = hashPainting(() => buildings.paintBuilding('landmark', PIN_TEAM, age, civ, false));
      expect(hashPainting(() => buildings.paintBuilding('landmark', PIN_TEAM, age, civ, false))).toBe(once);
    }
  });

  it.each(CIV_IDS)('%s: no lit landmark window is hidden behind a later face', (civ) => {
    for (const age of AGES) {
      expect(occludedGlows(() => buildings.paintBuilding('landmark', PIN_TEAM, age, civ, false)), `landmark@${age}`).toEqual([]);
    }
  });

  it('the team colour shows (the flag): two teams paint differently', () => {
    const a = hashPainting(() => buildings.paintBuilding('landmark', PIN_TEAM, 2, 'hungarian', false));
    const b = hashPainting(() => buildings.paintBuilding('landmark', 0xd04a4a, 2, 'hungarian', false));
    expect(a).not.toBe(b);
  });
});
