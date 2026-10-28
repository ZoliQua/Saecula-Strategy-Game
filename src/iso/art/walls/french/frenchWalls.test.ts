import { beforeAll, describe, expect, it } from 'vitest';
import { WALL_E, WALL_N, WALL_NE, WALL_NW, WALL_S, WALL_SE, WALL_SW, WALL_W } from '../../../../game/wallNeighbours';
import { CIV_DEFS, CIV_IDS } from '../../../../config/civs';
import type { AgeId, CivId } from '../../../../types';
import type { LitArt } from '../../lighting/normalLayer';
import { hashPainting, installRecordingCanvas } from '../../testing/recordingCanvas.testkit';
import { COMMON_WALL_PIECES } from '../commonWallPieces';

const POST = 256;
const AGES: readonly AgeId[] = [1, 2, 3];
const PIECES: readonly number[] = [
  ...COMMON_WALL_PIECES,
  WALL_E | WALL_W | WALL_S | POST,
  WALL_N | WALL_E | WALL_S | WALL_W | POST,
  WALL_NE | WALL_SW | POST,
  WALL_NE | WALL_NW | POST,
];
const ARMS = [WALL_N, WALL_E, WALL_S, WALL_W, WALL_NE, WALL_SE, WALL_SW, WALL_NW] as const;
/** Far end of each arm bit (paintWall ARM_ENDS). */
const END: Record<number, readonly [number, number]> = {
  [WALL_N]: [0.5, 0], [WALL_E]: [1, 0.5], [WALL_S]: [0.5, 1], [WALL_W]: [0, 0.5],
  [WALL_NE]: [1, 0], [WALL_SE]: [1, 1], [WALL_SW]: [0, 1], [WALL_NW]: [0, 0],
};
/** One civ per other registered wall style set (Hungarian, English, earlier M5 civs; stubs share Hungarian's). */
const OTHERS: readonly CivId[] = (() => {
  const seen = new Map<string, CivId>();
  const own = JSON.stringify(CIV_DEFS.french.wallStyle);
  for (const civ of CIV_IDS) {
    const key = JSON.stringify(CIV_DEFS[civ].wallStyle);
    if (key !== own && !seen.has(key)) seen.set(key, civ);
  }
  return [...seen.values()];
})();

const lightingData = (art: LitArt) => ({ volume: art.volume, glows: art.glows, lights: art.lights, smoke: art.smoke });
const topZ = (art: LitArt) => Math.max(...art.volume.map((v) => v.z));

describe('French wall styles', () => {
  let paintWall: typeof import('../paintWall');
  let styles: typeof import('../wallStyles');
  let french: typeof import('./frenchWalls');
  beforeAll(async () => {
    installRecordingCanvas();
    paintWall = await import('../paintWall');
    styles = await import('../wallStyles');
    french = await import('./frenchWalls');
  });

  it('resolves French walls through the registry', () => {
    expect(styles.wallStyleFor(1, 'french')).toBe(french.FRENCH_WALL_STYLES.murus_gallicus);
    expect(styles.wallStyleFor(2, 'french')).toBe(french.FRENCH_WALL_STYLES.pepperpot_curtain);
    expect(styles.wallStyleFor(3, 'french')).toBe(french.FRENCH_WALL_STYLES.vauban);
    for (const age of AGES) expect(styles.wallStyleFor(age, 'french').readback).toBe(true);
  });

  it.each(AGES)('age %s: every piece paints deterministically, with a shadow volume, inside its canvas', (age) => {
    for (const piece of PIECES) {
      const art = paintWall.paintWallPiece(piece, age, 'french');
      expect(art.volume.length).toBeGreaterThan(0);
      expect(topZ(art)).toBeLessThanOrEqual(paintWall.wallMaxHeight(styles.wallStyleFor(age, 'french')));
    }
    const run = () => hashPainting(() => PIECES.map((piece) => lightingData(paintWall.paintWallPiece(piece, age, 'french'))));
    expect(run()).toBe(run());
  });

  it('compares against every other registered wall style set', () => {
    expect(OTHERS).toEqual(expect.arrayContaining(['hungarian', 'english', 'german']));
  });

  it.each(AGES)('age %s: every piece differs from every other registered civ\'s piece', (age) => {
    for (const piece of PIECES) {
      const hash = (civ: CivId) => hashPainting(() => lightingData(paintWall.paintWallPiece(piece, age, civ)));
      const fr = hash('french');
      for (const civ of OTHERS) expect(fr, `${civ} piece ${piece}`).not.toBe(hash(civ));
    }
  });

  it('every arm reaches its post body (wallJoin rule)', () => {
    for (const age of AGES) {
      const style = styles.wallStyleFor(age, 'french');
      const body = style.postBody ?? style.postHalf;
      for (const bit of ARMS) {
        const diagonal = bit > WALL_W;
        const end = END[bit]!;
        const start = paintWall.armStartOf(style, diagonal, end[0] + end[1] <= 1);
        expect(start, `age ${age} arm ${bit}`).toBeLessThanOrEqual(body * (diagonal ? Math.SQRT2 : 1) + 1e-9);
      }
    }
  });

  it('banner pole stands on each French post top', () => {
    for (const age of AGES) {
      const [, dy] = paintWall.wallBannerAnchor(age, 'french');
      const [, huDy] = paintWall.wallBannerAnchor(age, 'hungarian');
      expect(dy).toBeLessThan(0);
      expect(dy - huDy).toBeCloseTo(-(styles.wallStyleFor(age, 'french').postTop - styles.wallStyleFor(age, 'hungarian').postTop) / 2);
    }
  });

  it('thatched Gaulish towers and pepperpot towers rise well above their runs', () => {
    for (const age of [1, 2] as const) {
      const run = paintWall.paintWallPiece(WALL_E | WALL_W, age, 'french');
      const post = paintWall.paintWallPiece(WALL_E | WALL_W | POST, age, 'french');
      expect(topZ(post)).toBeGreaterThan(topZ(run) + 50);
    }
    // The candle-snuffer cone tops the post: its apex is the post top (banner on the finial).
    const fr2 = topZ(paintWall.paintWallPiece(WALL_E | WALL_W | POST, 2, 'french'));
    expect(fr2).toBeCloseTo(styles.wallStyleFor(2, 'french').postTop, 0);
  });

  it('the Vauban trace stays low and sets a sentry box on every bastion, rhythm piers too', () => {
    const run = topZ(paintWall.paintWallPiece(WALL_E | WALL_W, 3, 'french'));
    const pier = topZ(paintWall.paintWallPiece(WALL_E | WALL_W | POST, 3, 'french'));
    const enPier = topZ(paintWall.paintWallPiece(WALL_E | WALL_W | POST, 3, 'english'));
    expect(run).toBeLessThan(45);
    expect(pier).toBeGreaterThan(enPier + 10);
    expect(pier).toBeGreaterThan(run + 20);
  });
});
