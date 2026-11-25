import { beforeAll, describe, expect, it } from 'vitest';
import { CIV_DEFS } from '../../config/civs';
import type { AgeId, CivId } from '../../types';
import { occludedGlows } from './testing/occludedGlows.testkit';
import { PIN_TEAM } from './testing/pinnedArt.testkit';
import { hashPainting, installRecordingCanvas, type RecordedCanvas } from './testing/recordingCanvas.testkit';

/*
 * M17 Task 4: the Hungarian Végvár, the English Royal Dockyard, the German
 * Hanza-kontor and the French Akadémia, each its own painter. Each
 * paints in the ages it shows (2 and 3) deterministically, differently per
 * age (the palette follows the age), hides no lit window behind a later
 * face, keeps its volume inside its canvas, and still paints in age 1
 * (never shown, must not throw). No hash is pinned (draw-log hashes differ
 * between Node versions).
 */

const CIVS: readonly CivId[] = ['hungarian', 'english', 'german', 'french'];
const SHOWN: readonly AgeId[] = [2, 3];
const drawCalls = (canvas: HTMLCanvasElement): number => (canvas as unknown as RecordedCanvas).log.length;

describe('landmark art: Hungarian, English, German, French', () => {
  let buildings: typeof import('./buildings');
  let registry: typeof import('./architecture/registry');
  let painter: typeof import('./isoPainter');
  beforeAll(async () => {
    installRecordingCanvas();
    buildings = await import('./buildings');
    registry = await import('./architecture/registry');
    painter = await import('./isoPainter');
  });

  it.each(CIVS)('%s: has its own painter, shared with no other civ', (civ) => {
    const others = (Object.keys(registry.LANDMARK_ART) as CivId[]).filter((c) => c !== civ);
    for (const other of others) expect(registry.LANDMARK_ART[civ]).not.toBe(registry.LANDMARK_ART[other]);
  });

  it.each(CIVS)('%s: paints ages 2 and 3 deterministically, differently per age, and age 1 without throwing', (civ) => {
    const hashes = SHOWN.map((age) => {
      const art = buildings.paintBuilding('landmark', PIN_TEAM, age, civ, false);
      expect(drawCalls(art.canvas), `landmark@${age}`).toBeGreaterThan(300);
      const once = hashPainting(() => buildings.paintBuilding('landmark', PIN_TEAM, age, civ, false));
      expect(hashPainting(() => buildings.paintBuilding('landmark', PIN_TEAM, age, civ, false))).toBe(once);
      return once;
    });
    expect(new Set(hashes).size).toBe(2);
    expect(() => buildings.paintBuilding('landmark', PIN_TEAM, 1, civ, false)).not.toThrow();
  });

  it.each(CIVS.flatMap((civ) => ([1, 2, 3] as const).map((age) => [civ, age] as const)))('%s age %i: no lit window is hidden behind a later face', (civ, age) => {
    expect(occludedGlows(() => buildings.paintBuilding('landmark', PIN_TEAM, age, civ, false))).toEqual([]);
  });

  it.each(CIVS)('%s: the volume stays inside the canvas height, in every age style', (civ) => {
    for (const id of Object.values(CIV_DEFS[civ].architecture)) {
      const art = registry.LANDMARK_ART[civ](registry.ARCH_STYLES[id]);
      expect(art.size).toBe(3);
      const p = new painter.IsoPainter(3, 3, art.maxHeight, 1);
      art.paint(p, PIN_TEAM);
      const top = Math.max(...p.result(false).volume.map((pt) => pt.z));
      expect(top, id).toBeLessThanOrEqual(art.maxHeight);
    }
  });

  it.each(CIVS)('%s: the team colour shows', (civ) => {
    const a = hashPainting(() => buildings.paintBuilding('landmark', PIN_TEAM, 2, civ, false));
    const b = hashPainting(() => buildings.paintBuilding('landmark', 0xd04a4a, 2, civ, false));
    expect(a).not.toBe(b);
  });
});
