import { beforeAll, describe, expect, it } from 'vitest';
import { WALL_E, WALL_N, WALL_NE, WALL_NW, WALL_S, WALL_SE, WALL_SW, WALL_W } from '../../../game/wallNeighbours';
import type { AgeId } from '../../../types';
import type { LitArt } from '../lighting/normalLayer';
import { hashPainting, installRecordingCanvas } from '../testing/recordingCanvas';
import { COMMON_WALL_PIECES } from './commonWallPieces';

/*
 * Pixel-identity guard for the Hungarian wall pieces (M4 Task 5): every
 * common piece plus junctions, crosses and diagonal joins of every age
 * is painted onto recording canvases (albedo + normal layer); the hash
 * of all pieces' draw logs and lighting data is compared to the hash
 * recorded at 8c43c49, before the English wall styles were added.
 */

const POST = 256;
const EXTRA_PIECES: readonly number[] = [
  WALL_E | WALL_W | WALL_S | POST,
  WALL_N | WALL_S | WALL_E | POST,
  WALL_N | WALL_E | WALL_S | WALL_W | POST,
  WALL_NE | WALL_SW | POST,
  WALL_NE | WALL_NW | POST,
  WALL_SE | WALL_SW | POST,
  WALL_N | WALL_SE | POST,
  WALL_E | WALL_NW | WALL_SW | POST,
];
const PIECES = [...COMMON_WALL_PIECES, ...EXTRA_PIECES];

/** Recorded at 8c43c49. */
const EXPECTED: Record<AgeId, string> = { 1: 'dc88c004228f2e34', 2: '064e94d92b933f6a', 3: 'b4912dc7bffee00f' };

function lightingData(art: LitArt): unknown {
  return { volume: art.volume, glows: art.glows, lights: art.lights, smoke: art.smoke, normal: art.normal !== null };
}

describe('Hungarian wall pieces stay pixel-identical', () => {
  let paintWall: typeof import('./paintWall');
  beforeAll(async () => {
    installRecordingCanvas();
    paintWall = await import('./paintWall');
  });

  it.each([1, 2, 3] as const)('age %s', (age) => {
    const hash = hashPainting(() => PIECES.map((piece) => lightingData(paintWall.paintWallPiece(piece, age, 'hungarian'))));
    if (process.env.PRINT_ART_HASHES) console.log(`  ${age}: '${hash}',`);
    expect(hash).toBe(EXPECTED[age]);
  });
});
