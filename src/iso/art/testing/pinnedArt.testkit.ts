import { beforeAll, describe, expect, it } from 'vitest';
import { WALL_E, WALL_N, WALL_NE, WALL_NW, WALL_S, WALL_SE, WALL_SW, WALL_W } from '../../../game/wallNeighbours';
import type { AgeId, BuildingType, CivId } from '../../../types';
import type { LitArt } from '../lighting/normalLayer';
import { ANIM_FRAMES, PAINTED_HEADINGS } from '../units/layout';
import { COMMON_WALL_PIECES } from '../walls/commonWallPieces';
import { hashPainting, installRecordingCanvas } from './recordingCanvas.testkit';
import { UNIT_TYPES, unitGeometryHash, unitPixelsHash } from './unitPins.testkit';

/*
 * Pixel-identity pins for a civ's art (test-only). Each civ's pin test
 * calls these with its recorded hashes, so a later shared-helper refactor
 * cannot silently change a finished civ:
 *  - pinBuildings: every building type × age and every Wonder stage,
 *    painted onto recording canvases; hash of the draw log plus the
 *    lighting data (volume, glows, lights, smoke). A draw log that
 *    matches call for call paints the same pixels.
 *  - pinWalls: every common wall piece plus junctions, crosses and
 *    diagonal joins, one hash per age.
 *  - pinUnits: split unit pins (unitPins.testkit.ts) — PIXELS (posed
 *    figure + rasterized frames) must never change; GEOMETRY (sheet
 *    size, frame placement) may be re-recorded when the packing changes,
 *    with the reason in the commit.
 * PRINT_ART_HASHES=1 prints the hashes in source form for recording.
 */

export const PINNED_BUILDING_TYPES: readonly BuildingType[] = [
  'town_center', 'house', 'farm', 'lumber_camp', 'mining_camp', 'barracks', 'archery_range',
  'stable', 'blacksmith', 'foundry', 'tower', 'wall', 'wonder',
];
const AGES: readonly AgeId[] = [1, 2, 3];
const WONDER_STAGES = [1, 2, 3] as const;
/** Team colour every building pin is painted in. */
export const PIN_TEAM = 0x3b6fd6;

const POST = 256;
const EXTRA_WALL_PIECES: readonly number[] = [
  WALL_E | WALL_W | WALL_S | POST,
  WALL_N | WALL_S | WALL_E | POST,
  WALL_N | WALL_E | WALL_S | WALL_W | POST,
  WALL_NE | WALL_SW | POST,
  WALL_NE | WALL_NW | POST,
  WALL_SE | WALL_SW | POST,
  WALL_N | WALL_SE | POST,
  WALL_E | WALL_NW | WALL_SW | POST,
];
const WALL_PIECES = [...COMMON_WALL_PIECES, ...EXTRA_WALL_PIECES];

/** Building pins: keys `<type>@<age>` and `wonder~s<stage>`. */
export type BuildingPins = Readonly<Record<string, string>>;
export type WallPins = Readonly<Record<AgeId, string>>;
export interface UnitPins {
  readonly pixels: Readonly<Record<string, string>>;
  readonly geometry: Readonly<Record<string, string>>;
}

export function lightingData(art: LitArt): unknown {
  return { volume: art.volume, glows: art.glows, lights: art.lights, smoke: art.smoke, normal: art.normal !== null };
}

function check(name: string, hash: string, expected: string | undefined, quote = true): void {
  if (process.env['PRINT_ART_HASHES']) console.log(quote ? `  '${name}': '${hash}',` : `  ${name}: '${hash}',`);
  expect(hash).toBe(expected);
}

/** Registers a test per building type × age and per Wonder stage of `civ`. */
export function pinBuildings(civ: CivId, expected: BuildingPins): void {
  describe(`${civ} building art stays pixel-identical`, () => {
    let buildings: typeof import('../buildings');
    beforeAll(async () => {
      installRecordingCanvas();
      buildings = await import('../buildings');
    });

    const cases: Array<[string, () => string]> = [];
    for (const age of AGES) {
      for (const type of PINNED_BUILDING_TYPES) {
        cases.push([`${type}@${age}`, () => hashPainting(() => lightingData(buildings.paintBuilding(type, PIN_TEAM, age, civ, false)))]);
      }
    }
    for (const stage of WONDER_STAGES) {
      cases.push([`wonder~s${stage}`, () => hashPainting(() => lightingData(buildings.paintWonderStage(stage, civ)))]);
    }

    it.each(cases)('%s', (name, run) => check(name, run(), expected[name]));
  });
}

/** Registers a test per age: all wall pieces of `civ` in one hash. */
export function pinWalls(civ: CivId, expected: WallPins): void {
  describe(`${civ} wall pieces stay pixel-identical`, () => {
    let paintWall: typeof import('../walls/paintWall');
    beforeAll(async () => {
      installRecordingCanvas();
      paintWall = await import('../walls/paintWall');
    });

    it.each(AGES)('age %s', (age) => {
      const hash = hashPainting(() => WALL_PIECES.map((piece) => lightingData(paintWall.paintWallPiece(piece, age, civ))));
      check(String(age), hash, expected[age], false);
    });
  });
}

/** Registers the split pixel and geometry pins of every unit type of `civ`. */
export function pinUnits(civ: CivId, expected: UnitPins): void {
  describe(`${civ} unit art stays pixel-identical`, () => {
    it('paints five headings', () => {
      expect(PAINTED_HEADINGS.length).toBe(5);
      expect(ANIM_FRAMES.walk).toBe(6);
    });

    it.each(UNIT_TYPES)('%s pixels', (type) => check(type, unitPixelsHash(type, civ), expected.pixels[type], false));

    it.each(UNIT_TYPES)('%s sheet geometry', (type) => check(type, unitGeometryHash(type, civ), expected.geometry[type], false));
  });
}
