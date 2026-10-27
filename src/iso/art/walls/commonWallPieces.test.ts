import { describe, expect, it } from 'vitest';
import { WALL_E, WALL_N, WALL_NE, WALL_S, WALL_SW, WALL_W } from '../../../game/wallNeighbours';
import { wallPiece } from './wallPiece';
import type { AgeId, CivId } from '../../../types';
import { wallPieceKey } from '../artKeys';
import { COMMON_WALL_PIECES, commonWallPieceKeys, keepWallKeys } from './commonWallPieces';

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

describe('keepWallKeys', () => {
  it('keeps the ages a civ’s owners are in plus the next one, nothing later', () => {
    const keys = keepWallKeys(new Map([['english', new Set([1] as const)]]));
    const piece = COMMON_WALL_PIECES[0]!;
    expect(keys.has(wallPieceKey(piece, 1, 'english'))).toBe(true);
    expect(keys.has(wallPieceKey(piece, 2, 'english'))).toBe(true);
    expect([...keys].some((k) => k.includes('~a3~'))).toBe(false);
    expect(keys.size).toBe(2 * COMMON_WALL_PIECES.length);
  });

  it('follows each civ on its own and stops at the last age', () => {
    const keys = keepWallKeys(
      new Map<CivId, Set<AgeId>>([
        ['english', new Set<AgeId>([1, 3])],
        ['hungarian', new Set<AgeId>([2])],
      ]),
    );
    expect(keys).toEqual(new Set([...commonWallPieceKeys([1, 2, 3], ['english']), ...commonWallPieceKeys([2, 3], ['hungarian'])]));
  });
});
