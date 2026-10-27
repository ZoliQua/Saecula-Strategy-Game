import { describe, expect, it } from 'vitest';
import { WALL_E, WALL_N, WALL_NE, WALL_S, WALL_SW, WALL_W } from '../../../game/wallNeighbours';
import { wallPiece } from './wallPiece';
import { wallPieceKey } from '../artKeys';
import { COMMON_WALL_PIECES, commonWallPieceKeys, WallArtPrewarm } from './WallArtPrewarm';

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

describe('WallArtPrewarm', () => {
  it('paints one piece per step for each requested (age, civ), once', () => {
    const painted: string[] = [];
    const warm = new WallArtPrewarm((piece, age, civ) => painted.push(`${piece}/${age}/${civ}`));
    warm.request(2, 'hungarian');
    warm.request(2, 'hungarian');
    warm.request(2, 'english');
    let steps = 0;
    while (warm.step()) steps++;
    expect(painted).toHaveLength(COMMON_WALL_PIECES.length * 2);
    expect(steps).toBe(COMMON_WALL_PIECES.length * 2);
    expect(painted.filter((p) => p.endsWith('/2/english'))).toHaveLength(COMMON_WALL_PIECES.length);
    expect(painted.filter((p) => p.endsWith('/2/hungarian'))).toHaveLength(COMMON_WALL_PIECES.length);
  });

  it('lists the keys it keeps warm (eviction leaves them) for the ages and civs requested so far', () => {
    const warm = new WallArtPrewarm(() => undefined, (piece, age, civ) => `k${piece}a${age}${civ}`);
    warm.request(1, 'hungarian');
    warm.request(3, 'english');
    const keep = warm.keys();
    expect(keep.size).toBe(COMMON_WALL_PIECES.length * 2);
    expect(keep.has(`k${COMMON_WALL_PIECES[0]}a3english`)).toBe(true);
    expect(keep.has(`k${COMMON_WALL_PIECES[0]}a3hungarian`)).toBe(false);
  });

  it('commonWallPieceKeys covers every age of every civ in play with civ-qualified keys', () => {
    const keys = commonWallPieceKeys([1, 2, 3], ['hungarian', 'english']);
    expect(keys.size).toBe(COMMON_WALL_PIECES.length * 6);
    expect(keys.has(wallPieceKey(COMMON_WALL_PIECES[0]!, 2, 'english'))).toBe(true);
    expect(commonWallPieceKeys([1], ['hungarian']).has(wallPieceKey(COMMON_WALL_PIECES[0]!, 1, 'english'))).toBe(false);
  });
});
