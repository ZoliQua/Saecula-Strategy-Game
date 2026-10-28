import { beforeAll, describe, expect, it } from 'vitest';
import { CIV_DEFS, CIV_IDS } from '../../config/civs';
import { WALL_E, WALL_W } from '../../game/wallNeighbours';
import type { AgeId } from '../../types';
import { PIN_TEAM, PINNED_BUILDING_TYPES } from './testing/pinnedArt.testkit';
import { installRecordingCanvas, type RecordedCanvas } from './testing/recordingCanvas.testkit';
import { UNIT_TYPES } from './testing/unitPins.testkit';

/*
 * M5 closing sweep (CLAUDE.md §9 M5): all eight civs are playable, every
 * registry row CIV_DEFS names exists, and every civ paints every building
 * type and Wonder stage in every age, its walls in every age and every
 * unit type. A guard for later edits: a civ row pointing at a missing
 * style, or a painter that throws for one civ, fails here.
 */

const AGES: readonly AgeId[] = [1, 2, 3];
const RUN = WALL_E | WALL_W;

/** Draw calls the art's canvas recorded (a painted picture has many). */
const drawCalls = (canvas: HTMLCanvasElement): number => (canvas as unknown as RecordedCanvas).log.length;

describe('all civs', () => {
  it('are all available', () => {
    expect(CIV_IDS.length).toBe(8);
    for (const civ of CIV_IDS) expect(CIV_DEFS[civ].available, civ).toBe(true);
  });

  it('name only registered architecture, wall and unit-look styles', async () => {
    const { ARCH_STYLES } = await import('./architecture/registry');
    const { WALL_STYLE_BY_ID } = await import('./walls/wallStyles');
    const { LOOK_OVERRIDES } = await import('./units/looks');
    for (const civ of CIV_IDS) {
      const def = CIV_DEFS[civ];
      for (const age of AGES) {
        expect(ARCH_STYLES[def.architecture[age]], `${civ} architecture @${age}`).toBeDefined();
        expect(WALL_STYLE_BY_ID[def.wallStyle[age]], `${civ} walls @${age}`).toBeDefined();
      }
      expect(LOOK_OVERRIDES[def.unitLook], `${civ} unit look`).toBeDefined();
    }
  });
});

describe('every civ paints all its art', () => {
  let buildings: typeof import('./buildings');
  let paintWall: typeof import('./walls/paintWall');
  let sheet: typeof import('./units/sheet');
  beforeAll(async () => {
    installRecordingCanvas();
    buildings = await import('./buildings');
    paintWall = await import('./walls/paintWall');
    sheet = await import('./units/sheet');
  });

  it.each(CIV_IDS)('%s: every building type in every age, and every Wonder stage', (civ) => {
    for (const age of AGES) {
      for (const type of PINNED_BUILDING_TYPES) {
        const art = buildings.paintBuilding(type, PIN_TEAM, age, civ, false);
        expect(art.canvas.width * art.canvas.height, `${type}@${age}`).toBeGreaterThan(0);
        expect(drawCalls(art.canvas), `${type}@${age}`).toBeGreaterThan(20);
      }
    }
    for (const stage of [1, 2, 3]) expect(drawCalls(buildings.paintWonderStage(stage, civ).canvas), `wonder~s${stage}`).toBeGreaterThan(20);
  });

  it.each(CIV_IDS)('%s: a wall run in every age', (civ) => {
    for (const age of AGES) expect(drawCalls(paintWall.paintWallPiece(RUN, age, civ).canvas), `wall@${age}`).toBeGreaterThan(20);
  });

  it.each(CIV_IDS)('%s: every unit type (first frame covers pixels)', (civ) => {
    for (const type of UNIT_TYPES) {
      const g = sheet.sheetGeometry(type, civ);
      expect(g.layout.frameCount, type).toBeGreaterThan(0);
      const px = sheet.rasterizeFrame(type, civ, 0);
      expect(px.coverage.some((c) => c > 0), type).toBe(true);
    }
  });
});
