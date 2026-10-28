import { beforeAll, describe, expect, it } from 'vitest';
import { WALL_E, WALL_N, WALL_NE, WALL_NW, WALL_S, WALL_SE, WALL_SW, WALL_W } from '../../../../game/wallNeighbours';
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

const lightingData = (art: LitArt) => ({ volume: art.volume, glows: art.glows, lights: art.lights, smoke: art.smoke });
const topZ = (art: LitArt) => Math.max(...art.volume.map((v) => v.z));

describe('German wall styles', () => {
  let paintWall: typeof import('../paintWall');
  let styles: typeof import('../wallStyles');
  let german: typeof import('./germanWalls');
  beforeAll(async () => {
    installRecordingCanvas();
    paintWall = await import('../paintWall');
    styles = await import('../wallStyles');
    german = await import('./germanWalls');
  });

  it('resolves German walls through the registry', () => {
    expect(styles.wallStyleFor(1, 'german')).toBe(german.GERMAN_WALL_STYLES.limes_palisade);
    expect(styles.wallStyleFor(2, 'german')).toBe(german.GERMAN_WALL_STYLES.backstein_curtain);
    expect(styles.wallStyleFor(3, 'german')).toBe(german.GERMAN_WALL_STYLES.sandstone_fort);
    for (const age of AGES) expect(styles.wallStyleFor(age, 'german').readback).toBe(true);
  });

  it.each(AGES)('age %s: every piece paints deterministically, with a shadow volume, inside its canvas', (age) => {
    for (const piece of PIECES) {
      const art = paintWall.paintWallPiece(piece, age, 'german');
      expect(art.volume.length).toBeGreaterThan(0);
      expect(topZ(art)).toBeLessThanOrEqual(paintWall.wallMaxHeight(styles.wallStyleFor(age, 'german')));
    }
    const run = () => hashPainting(() => PIECES.map((piece) => lightingData(paintWall.paintWallPiece(piece, age, 'german'))));
    expect(run()).toBe(run());
  });

  it.each(AGES)('age %s: every piece differs from the Hungarian and the English piece', (age) => {
    for (const piece of PIECES) {
      const hash = (civ: CivId) => hashPainting(() => lightingData(paintWall.paintWallPiece(piece, age, civ)));
      const de = hash('german');
      expect(de).not.toBe(hash('hungarian'));
      expect(de).not.toBe(hash('english'));
    }
  });

  it('every arm reaches its post body (wallJoin rule)', () => {
    for (const age of AGES) {
      const style = styles.wallStyleFor(age, 'german');
      const body = style.postBody ?? style.postHalf;
      for (const bit of ARMS) {
        const diagonal = bit > WALL_W;
        const end = END[bit]!;
        const start = paintWall.armStartOf(style, diagonal, end[0] + end[1] <= 1);
        expect(start, `age ${age} arm ${bit}`).toBeLessThanOrEqual(body * (diagonal ? Math.SQRT2 : 1) + 1e-9);
      }
    }
  });

  it('banner pole stands on each German post top', () => {
    for (const age of AGES) {
      const [, dy] = paintWall.wallBannerAnchor(age, 'german');
      const [, huDy] = paintWall.wallBannerAnchor(age, 'hungarian');
      expect(dy).toBeLessThan(0);
      expect(dy - huDy).toBeCloseTo(-(styles.wallStyleFor(age, 'german').postTop - styles.wallStyleFor(age, 'hungarian').postTop) / 2);
    }
  });

  it('watchtowers and needle-capped piers rise well above their runs; the star fort mounts guns on corners only', () => {
    for (const age of [1, 2] as const) {
      const run = paintWall.paintWallPiece(WALL_E | WALL_W, age, 'german');
      const post = paintWall.paintWallPiece(WALL_E | WALL_W | POST, age, 'german');
      expect(topZ(post)).toBeGreaterThan(topZ(run) + 40);
    }
    // The age-2 pier's needle stands taller than the English Norman tower.
    const de2 = topZ(paintWall.paintWallPiece(WALL_E | WALL_W | POST, 2, 'german'));
    const en2 = topZ(paintWall.paintWallPiece(WALL_E | WALL_W | POST, 2, 'english'));
    expect(de2).toBeGreaterThan(en2);
    const corner = paintWall.paintWallPiece(WALL_N | WALL_E | POST, 3, 'german');
    const pier = paintWall.paintWallPiece(WALL_E | WALL_W | POST, 3, 'german');
    expect(topZ(corner)).toBeGreaterThan(topZ(pier));
  });
});
