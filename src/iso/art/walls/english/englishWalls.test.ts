import { beforeAll, describe, expect, it } from 'vitest';
import { WALL_E, WALL_N, WALL_NE, WALL_NW, WALL_S, WALL_SW, WALL_W } from '../../../../game/wallNeighbours';
import type { AgeId } from '../../../../types';
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

const lightingData = (art: LitArt) => ({ volume: art.volume, glows: art.glows, lights: art.lights, smoke: art.smoke });
const topZ = (art: LitArt) => Math.max(...art.volume.map((v) => v.z));

describe('English wall styles', () => {
  let paintWall: typeof import('../paintWall');
  let styles: typeof import('../wallStyles');
  let english: typeof import('./englishWalls');
  beforeAll(async () => {
    installRecordingCanvas();
    paintWall = await import('../paintWall');
    styles = await import('../wallStyles');
    english = await import('./englishWalls');
  });

  it('resolves English walls through the registry; Hungarian keeps its own', () => {
    expect(styles.wallStyleFor(1, 'english')).toBe(english.ENGLISH_WALL_STYLES.bank_palisade);
    expect(styles.wallStyleFor(2, 'english')).toBe(english.ENGLISH_WALL_STYLES.norman_curtain);
    expect(styles.wallStyleFor(3, 'english')).toBe(english.ENGLISH_WALL_STYLES.star_fort);
    for (const age of AGES) {
      expect(styles.wallStyleFor(age, 'hungarian')).toBe(styles.WALL_STYLES[age]);
      expect(styles.wallStyleFor(age, 'hungarian').readback).toBeUndefined();
      expect(styles.wallStyleFor(age, 'english').readback).toBe(true);
    }
  });

  it.each(AGES)('age %s: every piece paints deterministically, with a shadow volume, inside its canvas', (age) => {
    for (const piece of PIECES) {
      const art = paintWall.paintWallPiece(piece, age, 'english');
      expect(art.volume.length).toBeGreaterThan(0);
      expect(topZ(art)).toBeLessThanOrEqual(paintWall.wallMaxHeight(styles.wallStyleFor(age, 'english')));
    }
    const run = () => hashPainting(() => PIECES.map((piece) => lightingData(paintWall.paintWallPiece(piece, age, 'english'))));
    expect(run()).toBe(run());
  });

  it.each(AGES)('age %s: every piece differs from the Hungarian piece', (age) => {
    for (const piece of PIECES) {
      const en = hashPainting(() => lightingData(paintWall.paintWallPiece(piece, age, 'english')));
      const hu = hashPainting(() => lightingData(paintWall.paintWallPiece(piece, age, 'hungarian')));
      expect(en).not.toBe(hu);
    }
  });

  it('banner pole stands on each English post top', () => {
    for (const age of AGES) {
      const [, dy] = paintWall.wallBannerAnchor(age, 'english');
      const [, huDy] = paintWall.wallBannerAnchor(age, 'hungarian');
      expect(dy).toBeLessThan(0);
      expect(dy - huDy).toBeCloseTo(-(styles.wallStyleFor(age, 'english').postTop - styles.wallStyleFor(age, 'hungarian').postTop) / 2);
    }
  });

  it('mounts a gun on corner and end bastions only (age 3), so they stand above a run pier', () => {
    const corner = paintWall.paintWallPiece(WALL_N | WALL_E | POST, 3, 'english');
    const end = paintWall.paintWallPiece(WALL_E | POST, 3, 'english');
    const pier = paintWall.paintWallPiece(WALL_E | WALL_W | POST, 3, 'english');
    expect(topZ(corner)).toBeGreaterThan(topZ(pier));
    expect(topZ(end)).toBeGreaterThan(topZ(pier));
  });

  it('Norman towers rise above their curtain, watch-posts above their palisade', () => {
    for (const age of [1, 2] as const) {
      const run = paintWall.paintWallPiece(WALL_E | WALL_W, age, 'english');
      const post = paintWall.paintWallPiece(WALL_E | WALL_W | POST, age, 'english');
      expect(topZ(post)).toBeGreaterThan(topZ(run) + 20);
    }
  });
});
