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
  WALL_NW | WALL_SE | POST,
];
const ARMS = [WALL_N, WALL_E, WALL_S, WALL_W, WALL_NE, WALL_SE, WALL_SW, WALL_NW] as const;
/** Far end of each arm bit (paintWall ARM_ENDS). */
const END: Record<number, readonly [number, number]> = {
  [WALL_N]: [0.5, 0], [WALL_E]: [1, 0.5], [WALL_S]: [0.5, 1], [WALL_W]: [0, 0.5],
  [WALL_NE]: [1, 0], [WALL_SE]: [1, 1], [WALL_SW]: [0, 1], [WALL_NW]: [0, 0],
};
/** One civ per other registered wall style set (Hungarian, English and the other M5 civs). */
const OTHERS: readonly CivId[] = (() => {
  const seen = new Map<string, CivId>();
  const own = JSON.stringify(CIV_DEFS.finnish.wallStyle);
  for (const civ of CIV_IDS) {
    const key = JSON.stringify(CIV_DEFS[civ].wallStyle);
    if (key !== own && !seen.has(key)) seen.set(key, civ);
  }
  return [...seen.values()];
})();

const lightingData = (art: LitArt) => ({ volume: art.volume, glows: art.glows, lights: art.lights, smoke: art.smoke });
const topZ = (art: LitArt) => Math.max(...art.volume.map((v) => v.z));
const RUNS = [WALL_E | WALL_W, WALL_N | WALL_S, WALL_NE | WALL_SW];

describe('Finnish wall styles', () => {
  let paintWall: typeof import('../paintWall');
  let styles: typeof import('../wallStyles');
  let finnish: typeof import('./finnishWalls');
  beforeAll(async () => {
    installRecordingCanvas();
    paintWall = await import('../paintWall');
    styles = await import('../wallStyles');
    finnish = await import('./finnishWalls');
  });

  it('resolves Finnish walls through the registry', () => {
    expect(styles.wallStyleFor(1, 'finnish')).toBe(finnish.FINNISH_WALL_STYLES.hillfort);
    expect(styles.wallStyleFor(2, 'finnish')).toBe(finnish.FINNISH_WALL_STYLES.granite_curtain);
    expect(styles.wallStyleFor(3, 'finnish')).toBe(finnish.FINNISH_WALL_STYLES.granite_bastion);
    for (const age of AGES) expect(styles.wallStyleFor(age, 'finnish').readback).toBe(true);
  });

  it.each(AGES)('age %s: every piece paints deterministically, with a shadow volume, inside its canvas', (age) => {
    for (const piece of PIECES) {
      const art = paintWall.paintWallPiece(piece, age, 'finnish');
      expect(art.volume.length).toBeGreaterThan(0);
      expect(topZ(art)).toBeLessThanOrEqual(paintWall.wallMaxHeight(styles.wallStyleFor(age, 'finnish')));
    }
    const run = () => hashPainting(() => PIECES.map((piece) => lightingData(paintWall.paintWallPiece(piece, age, 'finnish'))));
    expect(run()).toBe(run());
  });

  it('compares against every other registered wall style set', () => {
    expect(OTHERS).toEqual(expect.arrayContaining(['hungarian', 'english', 'german', 'french', 'spanish', 'italian', 'russian']));
    expect(OTHERS).toHaveLength(7);
  });

  it.each(AGES)("age %s: every piece differs from every other registered civ's piece", (age) => {
    for (const piece of PIECES) {
      const hash = (civ: CivId) => hashPainting(() => lightingData(paintWall.paintWallPiece(piece, age, civ)));
      const fi = hash('finnish');
      for (const civ of OTHERS) expect(fi, `${civ} piece ${piece}`).not.toBe(hash(civ));
    }
  });

  it('every arm reaches its post body (wallJoin rule)', () => {
    for (const age of AGES) {
      const style = styles.wallStyleFor(age, 'finnish');
      const body = style.postBody ?? style.postHalf;
      for (const bit of ARMS) {
        const diagonal = bit > WALL_W;
        const end = END[bit]!;
        const start = paintWall.armStartOf(style, diagonal, end[0] + end[1] <= 1);
        expect(start, `age ${age} arm ${bit}`).toBeLessThanOrEqual(body * (diagonal ? Math.SQRT2 : 1) + 1e-9);
      }
    }
  });

  it('banner pole stands on each Finnish post top', () => {
    for (const age of AGES) {
      const [, dy] = paintWall.wallBannerAnchor(age, 'finnish');
      const [, huDy] = paintWall.wallBannerAnchor(age, 'hungarian');
      expect(dy).toBeLessThan(0);
      expect(dy - huDy).toBeCloseTo(-(styles.wallStyleFor(age, 'finnish').postTop - styles.wallStyleFor(age, 'hungarian').postTop) / 2);
    }
  });

  it('age 1: the hill fort is a low heap, and its turf-roofed lookouts rise well above it', () => {
    for (const piece of RUNS) {
      const run = paintWall.paintWallPiece(piece, 1, 'finnish');
      expect(topZ(run), `piece ${piece}`).toBeLessThanOrEqual(finnish.HEAP_TOP + 1);
    }
    const run = topZ(paintWall.paintWallPiece(WALL_E | WALL_W, 1, 'finnish'));
    for (const p of PIECES.filter((pc) => pc & POST)) {
      expect(topZ(paintWall.paintWallPiece(p, 1, 'finnish')), `piece ${p}`).toBeGreaterThan(run + 36);
    }
    expect(finnish.HUT_TURF_RISE).toBeGreaterThanOrEqual(14);
  });

  it('age 2: every tower carries a broad, low shingle cone well above the curtain', () => {
    expect(finnish.CONE.rise).toBeLessThan(finnish.CONE.r * 64 * 1.5);
    for (const piece of RUNS) {
      const run = topZ(paintWall.paintWallPiece(piece, 2, 'finnish'));
      expect(run, `piece ${piece}`).toBeGreaterThan(finnish.CURTAIN_WALK);
      for (const p of PIECES.filter((pc) => pc & POST)) {
        expect(topZ(paintWall.paintWallPiece(p, 2, 'finnish')), `piece ${p}`).toBeGreaterThan(run + 40);
      }
    }
  });

  it('age 3: the bastion trace is topped with turf, and corner bastions carry a sentry box above it', () => {
    for (const piece of RUNS) {
      const run = paintWall.paintWallPiece(piece, 3, 'finnish');
      expect(topZ(run), `piece ${piece}`).toBeLessThan(finnish.BASTION_TURF_TOP);
    }
    const pier = topZ(paintWall.paintWallPiece(WALL_E | WALL_W | POST, 3, 'finnish'));
    const corner = topZ(paintWall.paintWallPiece(WALL_E | WALL_S | POST, 3, 'finnish'));
    expect(pier).toBe(finnish.BASTION_TURF_TOP);
    expect(corner).toBeGreaterThan(finnish.BASTION_TURF_TOP + 20);
  });
});
