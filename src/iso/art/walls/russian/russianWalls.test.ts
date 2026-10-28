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
  const own = JSON.stringify(CIV_DEFS.russian.wallStyle);
  for (const civ of CIV_IDS) {
    const key = JSON.stringify(CIV_DEFS[civ].wallStyle);
    if (key !== own && !seen.has(key)) seen.set(key, civ);
  }
  return [...seen.values()];
})();

const lightingData = (art: LitArt) => ({ volume: art.volume, glows: art.glows, lights: art.lights, smoke: art.smoke });
const topZ = (art: LitArt) => Math.max(...art.volume.map((v) => v.z));
const RUNS = [WALL_E | WALL_W, WALL_N | WALL_S, WALL_NE | WALL_SW];

describe('Russian wall styles', () => {
  let paintWall: typeof import('../paintWall');
  let styles: typeof import('../wallStyles');
  let russian: typeof import('./russianWalls');
  beforeAll(async () => {
    installRecordingCanvas();
    paintWall = await import('../paintWall');
    styles = await import('../wallStyles');
    russian = await import('./russianWalls');
  });

  it('resolves Russian walls through the registry', () => {
    expect(styles.wallStyleFor(1, 'russian')).toBe(russian.RUSSIAN_WALL_STYLES.rus_palisade);
    expect(styles.wallStyleFor(2, 'russian')).toBe(russian.RUSSIAN_WALL_STYLES.gorodnya);
    expect(styles.wallStyleFor(3, 'russian')).toBe(russian.RUSSIAN_WALL_STYLES.kremlin);
    for (const age of AGES) expect(styles.wallStyleFor(age, 'russian').readback).toBe(true);
  });

  it.each(AGES)('age %s: every piece paints deterministically, with a shadow volume, inside its canvas', (age) => {
    for (const piece of PIECES) {
      const art = paintWall.paintWallPiece(piece, age, 'russian');
      expect(art.volume.length).toBeGreaterThan(0);
      expect(topZ(art)).toBeLessThanOrEqual(paintWall.wallMaxHeight(styles.wallStyleFor(age, 'russian')));
    }
    const run = () => hashPainting(() => PIECES.map((piece) => lightingData(paintWall.paintWallPiece(piece, age, 'russian'))));
    expect(run()).toBe(run());
  });

  it('compares against every other registered wall style set', () => {
    expect(OTHERS).toEqual(expect.arrayContaining(['hungarian', 'english', 'german', 'french', 'spanish', 'italian']));
  });

  it.each(AGES)("age %s: every piece differs from every other registered civ's piece", (age) => {
    for (const piece of PIECES) {
      const hash = (civ: CivId) => hashPainting(() => lightingData(paintWall.paintWallPiece(piece, age, civ)));
      const ru = hash('russian');
      for (const civ of OTHERS) expect(ru, `${civ} piece ${piece}`).not.toBe(hash(civ));
    }
  });

  it('every arm reaches its post body (wallJoin rule)', () => {
    for (const age of AGES) {
      const style = styles.wallStyleFor(age, 'russian');
      const body = style.postBody ?? style.postHalf;
      for (const bit of ARMS) {
        const diagonal = bit > WALL_W;
        const end = END[bit]!;
        const start = paintWall.armStartOf(style, diagonal, end[0] + end[1] <= 1);
        expect(start, `age ${age} arm ${bit}`).toBeLessThanOrEqual(body * (diagonal ? Math.SQRT2 : 1) + 1e-9);
      }
    }
  });

  it('banner pole stands on each Russian post top', () => {
    for (const age of AGES) {
      const [, dy] = paintWall.wallBannerAnchor(age, 'russian');
      const [, huDy] = paintWall.wallBannerAnchor(age, 'hungarian');
      expect(dy).toBeLessThan(0);
      expect(dy - huDy).toBeCloseTo(-(styles.wallStyleFor(age, 'russian').postTop - styles.wallStyleFor(age, 'hungarian').postTop) / 2);
    }
  });

  it('age 1: the log wall stands on an earth rampart and its blockhouses rise well above it', () => {
    const run = paintWall.paintWallPiece(WALL_E | WALL_W, 1, 'russian');
    expect(topZ(run)).toBeGreaterThanOrEqual(russian.RAMPART_TOP + 26);
    const post = paintWall.paintWallPiece(WALL_E | WALL_W | POST, 1, 'russian');
    expect(topZ(post)).toBeGreaterThan(topZ(run) + 40);
  });

  it.each([2, 3] as const)('age %s: every tower carries a tall tent well above the run', (age) => {
    for (const piece of RUNS) {
      const run = topZ(paintWall.paintWallPiece(piece, age, 'russian'));
      for (const p of PIECES.filter((pc) => pc & POST)) {
        expect(topZ(paintWall.paintWallPiece(p, age, 'russian')), `piece ${p}`).toBeGreaterThan(run + 70);
      }
    }
    expect(russian.TENT_RISE[age]).toBeGreaterThanOrEqual(56);
  });

  it('age 2: the gorodnya run carries a roof over its fighting gallery', () => {
    for (const piece of RUNS) {
      const run = paintWall.paintWallPiece(piece, 2, 'russian');
      expect(topZ(run), `piece ${piece}`).toBeGreaterThanOrEqual(russian.GALLERY_RIDGE);
    }
  });

  it('age 3: the kremlin run is crowned by separate forked merlons standing clear of its wall-walk', () => {
    for (const piece of RUNS) {
      const run = paintWall.paintWallPiece(piece, 3, 'russian');
      const walk = russian.KREMLIN_WALK;
      const horns = run.volume.filter((v) => v.z > walk + 12);
      expect(new Set(horns.map((v) => `${Math.round(v.gx)}`)).size, `piece ${piece}`).toBeGreaterThanOrEqual(6);
    }
  });
});
