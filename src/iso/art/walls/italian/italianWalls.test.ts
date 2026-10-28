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
/** One civ per other registered wall style set (Hungarian, English, earlier M5 civs; stubs share Hungarian's). */
const OTHERS: readonly CivId[] = (() => {
  const seen = new Map<string, CivId>();
  const own = JSON.stringify(CIV_DEFS.italian.wallStyle);
  for (const civ of CIV_IDS) {
    const key = JSON.stringify(CIV_DEFS[civ].wallStyle);
    if (key !== own && !seen.has(key)) seen.set(key, civ);
  }
  return [...seen.values()];
})();

const lightingData = (art: LitArt) => ({ volume: art.volume, glows: art.glows, lights: art.lights, smoke: art.smoke });
const topZ = (art: LitArt) => Math.max(...art.volume.map((v) => v.z));

describe('Italian wall styles', () => {
  let paintWall: typeof import('../paintWall');
  let styles: typeof import('../wallStyles');
  let italian: typeof import('./italianWalls');
  beforeAll(async () => {
    installRecordingCanvas();
    paintWall = await import('../paintWall');
    styles = await import('../wallStyles');
    italian = await import('./italianWalls');
  });

  it('resolves Italian walls through the registry', () => {
    expect(styles.wallStyleFor(1, 'italian')).toBe(italian.ITALIAN_WALL_STYLES.servian);
    expect(styles.wallStyleFor(2, 'italian')).toBe(italian.ITALIAN_WALL_STYLES.ghibelline);
    expect(styles.wallStyleFor(3, 'italian')).toBe(italian.ITALIAN_WALL_STYLES.trace_italienne);
    for (const age of AGES) expect(styles.wallStyleFor(age, 'italian').readback).toBe(true);
  });

  it.each(AGES)('age %s: every piece paints deterministically, with a shadow volume, inside its canvas', (age) => {
    for (const piece of PIECES) {
      const art = paintWall.paintWallPiece(piece, age, 'italian');
      expect(art.volume.length).toBeGreaterThan(0);
      expect(topZ(art)).toBeLessThanOrEqual(paintWall.wallMaxHeight(styles.wallStyleFor(age, 'italian')));
    }
    const run = () => hashPainting(() => PIECES.map((piece) => lightingData(paintWall.paintWallPiece(piece, age, 'italian'))));
    expect(run()).toBe(run());
  });

  it('compares against every other registered wall style set', () => {
    expect(OTHERS).toEqual(expect.arrayContaining(['hungarian', 'english', 'german', 'french', 'spanish']));
  });

  it.each(AGES)("age %s: every piece differs from every other registered civ's piece", (age) => {
    for (const piece of PIECES) {
      const hash = (civ: CivId) => hashPainting(() => lightingData(paintWall.paintWallPiece(piece, age, civ)));
      const it_ = hash('italian');
      for (const civ of OTHERS) expect(it_, `${civ} piece ${piece}`).not.toBe(hash(civ));
    }
  });

  it('every arm reaches its post body (wallJoin rule)', () => {
    for (const age of AGES) {
      const style = styles.wallStyleFor(age, 'italian');
      const body = style.postBody ?? style.postHalf;
      for (const bit of ARMS) {
        const diagonal = bit > WALL_W;
        const end = END[bit]!;
        const start = paintWall.armStartOf(style, diagonal, end[0] + end[1] <= 1);
        expect(start, `age ${age} arm ${bit}`).toBeLessThanOrEqual(body * (diagonal ? Math.SQRT2 : 1) + 1e-9);
      }
    }
  });

  it('banner pole stands on each Italian post top', () => {
    for (const age of AGES) {
      const [, dy] = paintWall.wallBannerAnchor(age, 'italian');
      const [, huDy] = paintWall.wallBannerAnchor(age, 'hungarian');
      expect(dy).toBeLessThan(0);
      expect(dy - huDy).toBeCloseTo(-(styles.wallStyleFor(age, 'italian').postTop - styles.wallStyleFor(age, 'hungarian').postTop) / 2);
    }
  });

  it('ashlar and brick towers rise well above their runs', () => {
    for (const age of [1, 2] as const) {
      const run = paintWall.paintWallPiece(WALL_E | WALL_W, age, 'italian');
      const post = paintWall.paintWallPiece(WALL_E | WALL_W | POST, age, 'italian');
      expect(topZ(post)).toBeGreaterThan(topZ(run) + 25);
    }
  });

  it('the Ghibelline run is crowned by separate forked merlons standing clear of its wall-walk', () => {
    for (const piece of [WALL_E | WALL_W, WALL_N | WALL_S, WALL_NE | WALL_SW]) {
      const run = paintWall.paintWallPiece(piece, 2, 'italian');
      const walk = italian.GHIBELLINE_WALK;
      expect(topZ(run), `piece ${piece}`).toBeGreaterThanOrEqual(walk + 18);
      // Each merlon records both horn tips: several separate peaks along the run, not one parapet slab.
      const horns = run.volume.filter((v) => v.z > walk + 15);
      expect(new Set(horns.map((v) => `${Math.round(v.gx)}`)).size, `piece ${piece}`).toBeGreaterThanOrEqual(6);
    }
  });

  it('the forked merlon is cut by a V notch at least 12 px deep, deeper than its solid body', () => {
    expect(italian.MERLON.horn).toBeGreaterThanOrEqual(12);
    expect(italian.MERLON.horn).toBeGreaterThan(italian.MERLON.body);
    expect(italian.MERLON.width).toBeGreaterThanOrEqual(0.18);
  });

  it('the trace stays low and every pier carries a lantern-domed garitta well above it', () => {
    const run = topZ(paintWall.paintWallPiece(WALL_E | WALL_W, 3, 'italian'));
    expect(run).toBeLessThan(45);
    for (const piece of PIECES.filter((pc) => pc & POST)) {
      const top = topZ(paintWall.paintWallPiece(piece, 3, 'italian'));
      expect(top, `piece ${piece}`).toBeGreaterThan(run + 25);
    }
  });
});
