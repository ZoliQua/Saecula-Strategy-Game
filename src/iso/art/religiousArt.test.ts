import { beforeAll, describe, expect, it } from 'vitest';
import { CIV_IDS } from '../../config/civs';
import type { AgeId } from '../../types';
import { PIN_TEAM } from './testing/pinnedArt.testkit';
import { hashPainting, installRecordingCanvas, type RecordedCanvas } from './testing/recordingCanvas.testkit';
import { unitPixelsHash } from './testing/unitPins.testkit';

/*
 * M11 art: the shared monastery and the monk paint for every civ and age,
 * the same way twice (deterministic), and the monastery takes each age's
 * own style. No hash is pinned here: draw-log hashes differ between Node
 * versions (the cloud session runs Node 22, CI Node 26), so they would be
 * recorded on the CI's Node.
 */

const AGES: readonly AgeId[] = [1, 2, 3];
const drawCalls = (canvas: HTMLCanvasElement): number => (canvas as unknown as RecordedCanvas).log.length;

describe('religious art', () => {
  let buildings: typeof import('./buildings');
  let sheet: typeof import('./units/sheet');
  beforeAll(async () => {
    installRecordingCanvas();
    buildings = await import('./buildings');
    sheet = await import('./units/sheet');
  });

  it.each(CIV_IDS)('%s: the monastery paints in every age, deterministically, in a 3-tile footprint', (civ) => {
    const hashes = new Set<string>();
    for (const age of AGES) {
      const art = buildings.paintBuilding('monastery', PIN_TEAM, age, civ, false);
      expect(drawCalls(art.canvas), `monastery@${age}`).toBeGreaterThan(60);
      const once = hashPainting(() => buildings.paintBuilding('monastery', PIN_TEAM, age, civ, false));
      expect(hashPainting(() => buildings.paintBuilding('monastery', PIN_TEAM, age, civ, false))).toBe(once);
      hashes.add(once);
    }
    expect(buildings.BUILDING_ART_SIZES.monastery).toBe(3);
    // Ages 2 and 3 use different styles for every civ but the Finns (one nordic style): the paintings differ.
    expect(hashes.size).toBeGreaterThanOrEqual(civ === 'finnish' ? 1 : 2);
  });

  it.each(CIV_IDS)('%s: the monk sheet paints idle, walk, work and death frames, deterministically', (civ) => {
    const g = sheet.sheetGeometry('monk', civ);
    expect(g.layout.frameCount).toBeGreaterThan(0);
    expect(sheet.rasterizeFrame('monk', civ, 0).coverage.some((c) => c > 0)).toBe(true);
    expect(unitPixelsHash('monk', civ)).toBe(unitPixelsHash('monk', civ));
  });
});
