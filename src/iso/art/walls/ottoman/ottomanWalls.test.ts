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
/** One civ per other registered wall style set (Hungarian, English, the M5 civs). */
const OTHERS: readonly CivId[] = (() => {
  const seen = new Map<string, CivId>();
  const own = JSON.stringify(CIV_DEFS.ottoman.wallStyle);
  for (const civ of CIV_IDS) {
    const key = JSON.stringify(CIV_DEFS[civ].wallStyle);
    if (key !== own && !seen.has(key)) seen.set(key, civ);
  }
  return [...seen.values()];
})();

const lightingData = (art: LitArt) => ({ volume: art.volume, glows: art.glows, lights: art.lights, smoke: art.smoke });
const topZ = (art: LitArt) => Math.max(...art.volume.map((v) => v.z));
const RUNS = [WALL_E | WALL_W, WALL_N | WALL_S, WALL_NE | WALL_SW];

describe('Ottoman wall styles', () => {
  let paintWall: typeof import('../paintWall');
  let styles: typeof import('../wallStyles');
  let ottoman: typeof import('./ottomanWalls');
  beforeAll(async () => {
    installRecordingCanvas();
    paintWall = await import('../paintWall');
    styles = await import('../wallStyles');
    ottoman = await import('./ottomanWalls');
  });

  it('resolves Polish walls through the registry', () => {
    expect(styles.wallStyleFor(1, 'ottoman')).toBe(ottoman.OTTOMAN_WALL_STYLES.opus_mixtum);
    expect(styles.wallStyleFor(2, 'ottoman')).toBe(ottoman.OTTOMAN_WALL_STYLES.rumeli);
    expect(styles.wallStyleFor(3, 'ottoman')).toBe(ottoman.OTTOMAN_WALL_STYLES.ottoman_bastion);
    for (const age of AGES) expect(styles.wallStyleFor(age, 'ottoman').readback).toBe(true);
  });

  it.each(AGES)('age %s: every piece paints deterministically, with a shadow volume, inside its canvas', (age) => {
    for (const piece of PIECES) {
      const art = paintWall.paintWallPiece(piece, age, 'ottoman');
      expect(art.volume.length).toBeGreaterThan(0);
      expect(topZ(art)).toBeLessThanOrEqual(paintWall.wallMaxHeight(styles.wallStyleFor(age, 'ottoman')));
    }
    const run = () => hashPainting(() => PIECES.map((piece) => lightingData(paintWall.paintWallPiece(piece, age, 'ottoman'))));
    expect(run()).toBe(run());
  });

  it('compares against every other registered wall style set', () => {
    expect(OTHERS).toEqual(expect.arrayContaining(['hungarian', 'english', 'german', 'french', 'spanish', 'italian', 'russian', 'finnish', 'polish']));
    expect(OTHERS).toHaveLength(9);
  });

  it.each(AGES)("age %s: every piece differs from every other registered civ's piece", (age) => {
    for (const piece of PIECES) {
      const hash = (civ: CivId) => hashPainting(() => lightingData(paintWall.paintWallPiece(piece, age, civ)));
      const own = hash('ottoman');
      for (const civ of OTHERS) expect(own, `${civ} piece ${piece}`).not.toBe(hash(civ));
    }
  });

  it('every arm reaches its post body (wallJoin rule)', () => {
    for (const age of AGES) {
      const style = styles.wallStyleFor(age, 'ottoman');
      const body = style.postBody ?? style.postHalf;
      for (const bit of ARMS) {
        const diagonal = bit > WALL_W;
        const end = END[bit]!;
        const start = paintWall.armStartOf(style, diagonal, end[0] + end[1] <= 1);
        expect(start, `age ${age} arm ${bit}`).toBeLessThanOrEqual(body * (diagonal ? Math.SQRT2 : 1) + 1e-9);
      }
    }
  });

  it('banner pole stands on each Ottoman post top', () => {
    for (const age of AGES) {
      const [, dy] = paintWall.wallBannerAnchor(age, 'ottoman');
      const [, huDy] = paintWall.wallBannerAnchor(age, 'hungarian');
      expect(dy).toBeLessThan(0);
      expect(dy - huDy).toBeCloseTo(-(styles.wallStyleFor(age, 'ottoman').postTop - styles.wallStyleFor(age, 'hungarian').postTop) / 2);
    }
  });

  it('age 1: the banded curtain stays low, and the square towers rise well above it, crenellated', () => {
    for (const piece of RUNS) {
      expect(topZ(paintWall.paintWallPiece(piece, 1, 'ottoman')), `piece ${piece}`).toBeLessThanOrEqual(ottoman.MIXTUM_WALK + 12);
    }
    for (const p of PIECES.filter((pc) => pc & POST)) {
      expect(topZ(paintWall.paintWallPiece(p, 1, 'ottoman')), `piece ${p}`).toBeGreaterThan(ottoman.MIXTUM_TOWER);
    }
  });

  it('age 2: every round tower carries its tall lead cone well above the curtain', () => {
    expect(ottoman.RUMELI_CONE).toBeGreaterThanOrEqual(30);
    for (const piece of RUNS) {
      expect(topZ(paintWall.paintWallPiece(piece, 2, 'ottoman')), `piece ${piece}`).toBeLessThanOrEqual(ottoman.RUMELI_WALK + 12);
    }
    for (const p of PIECES.filter((pc) => pc & POST)) {
      expect(topZ(paintWall.paintWallPiece(p, 2, 'ottoman')), `piece ${p}`).toBeGreaterThanOrEqual(ottoman.RUMELI_WALK + ottoman.RUMELI_CONE);
    }
  });

  it('age 3: the bastion trace stays low, and corner bastions carry a domed köşk well above it', () => {
    for (const piece of RUNS) {
      expect(topZ(paintWall.paintWallPiece(piece, 3, 'ottoman')), `piece ${piece}`).toBeLessThanOrEqual(ottoman.BASTION_PARAPET);
    }
    const pier = topZ(paintWall.paintWallPiece(WALL_E | WALL_W | POST, 3, 'ottoman'));
    const corner = topZ(paintWall.paintWallPiece(WALL_E | WALL_S | POST, 3, 'ottoman'));
    expect(pier).toBe(ottoman.BASTION_PARAPET);
    expect(corner).toBeGreaterThan(ottoman.BASTION_PARAPET + 15);
  });
});
