import { beforeAll, describe, expect, it } from 'vitest';
import { CIV_IDS } from '../../config/civs';
import type { AgeId, UnitType } from '../../types';
import { PIN_TEAM } from './testing/pinnedArt.testkit';
import { hashPainting, installRecordingCanvas, type RecordedCanvas } from './testing/recordingCanvas.testkit';
import { unitPixelsHash } from './testing/unitPins.testkit';

/*
 * M14 art: the shared dock and the four ships paint for every civ (and the
 * dock for every age), the same way twice (deterministic). As for M11, no
 * hash is pinned (draw-log hashes differ between Node versions).
 */

const AGES: readonly AgeId[] = [1, 2, 3];
const SHIPS: readonly UnitType[] = ['fishing_boat', 'transport', 'galley', 'frigate'];
const drawCalls = (canvas: HTMLCanvasElement): number => (canvas as unknown as RecordedCanvas).log.length;

describe('naval art', () => {
  let buildings: typeof import('./buildings');
  let sheet: typeof import('./units/sheet');
  beforeAll(async () => {
    installRecordingCanvas();
    buildings = await import('./buildings');
    sheet = await import('./units/sheet');
  });

  it.each(CIV_IDS)('%s: the dock paints in every age, deterministically, in a 3-tile footprint', (civ) => {
    for (const age of AGES) {
      const art = buildings.paintBuilding('dock', PIN_TEAM, age, civ, false);
      expect(drawCalls(art.canvas), `dock@${age}`).toBeGreaterThan(40);
      const once = hashPainting(() => buildings.paintBuilding('dock', PIN_TEAM, age, civ, false));
      expect(hashPainting(() => buildings.paintBuilding('dock', PIN_TEAM, age, civ, false))).toBe(once);
    }
    expect(buildings.BUILDING_ART_SIZES.dock).toBe(3);
  });

  it.each(CIV_IDS)('%s: every ship sheet paints, deterministically, wider than a villager', (civ) => {
    const widest = (type: UnitType) => Math.max(...sheet.sheetGeometry(type, civ).frames.map((f) => f.w));
    const villager = widest('villager');
    for (const type of SHIPS) {
      const g = sheet.sheetGeometry(type, civ);
      expect(g.layout.frameCount, type).toBeGreaterThan(0);
      expect(sheet.rasterizeFrame(type, civ, 0).coverage.some((c) => c > 0), type).toBe(true);
      expect(unitPixelsHash(type, civ), type).toBe(unitPixelsHash(type, civ));
      expect(widest(type), type).toBeGreaterThan(villager);
    }
  });

  it('the civs paint their ships differently (hull palette), and the four ships differ', () => {
    const galleys = new Set(CIV_IDS.map((civ) => unitPixelsHash('galley', civ)));
    expect(galleys.size).toBe(CIV_IDS.length);
    expect(new Set(SHIPS.map((t) => unitPixelsHash(t, 'english'))).size).toBe(SHIPS.length);
  });
});
