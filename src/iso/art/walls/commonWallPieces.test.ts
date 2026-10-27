import { describe, expect, it } from 'vitest';
import { WALL_E, WALL_N, WALL_NE, WALL_S, WALL_SW, WALL_W } from '../../../game/wallNeighbours';
import { wallPiece } from './wallPiece';
import { wallPieceKey } from '../artKeys';
import { COMMON_WALL_PIECES, commonWallPieceKeys } from './commonWallPieces';

describe('COMMON_WALL_PIECES', () => {
  it('covers straight runs (with and without a rhythm post), ends, corners and a lone post', () => {
    for (const [mask, tx, ty] of [
      [WALL_E | WALL_W, 1, 0],
      [WALL_E | WALL_W, 4, 0],
      [WALL_N | WALL_S, 0, 2],
      [WALL_NE | WALL_SW, 3, 0],
      [WALL_E, 0, 0],
      [WALL_N | WALL_E, 0, 0],
      [0, 0, 0],
    ] as const) {
      expect(COMMON_WALL_PIECES).toContain(wallPiece(mask, tx, ty));
    }
    expect(new Set(COMMON_WALL_PIECES).size).toBe(COMMON_WALL_PIECES.length);
  });
});

describe('commonWallPieceKeys', () => {
  it('commonWallPieceKeys covers every age of every civ in play with civ-qualified keys', () => {
    const keys = commonWallPieceKeys([1, 2, 3], ['hungarian', 'english']);
    expect(keys.size).toBe(COMMON_WALL_PIECES.length * 6);
    expect(keys.has(wallPieceKey(COMMON_WALL_PIECES[0]!, 2, 'english'))).toBe(true);
    expect(commonWallPieceKeys([1], ['hungarian']).has(wallPieceKey(COMMON_WALL_PIECES[0]!, 1, 'english'))).toBe(false);
  });
});
