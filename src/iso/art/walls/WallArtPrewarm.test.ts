import { describe, expect, it } from 'vitest';
import { WALL_E, WALL_N, WALL_NE, WALL_S, WALL_SW, WALL_W } from '../../../game/wallNeighbours';
import { wallPiece } from './wallPiece';
import { COMMON_WALL_PIECES, WallArtPrewarm } from './WallArtPrewarm';

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
  it('paints one piece per step for each requested age, once', () => {
    const painted: string[] = [];
    const warm = new WallArtPrewarm((piece, age) => painted.push(`${piece}/${age}`));
    warm.request(2);
    warm.request(2);
    let steps = 0;
    while (warm.step()) steps++;
    expect(painted).toHaveLength(COMMON_WALL_PIECES.length);
    expect(steps).toBe(COMMON_WALL_PIECES.length);
    expect(painted.every((p) => p.endsWith('/2'))).toBe(true);
  });

  it('lists the keys it keeps warm (eviction leaves them) for the ages requested so far', () => {
    const warm = new WallArtPrewarm(() => undefined, (piece, age) => `k${piece}a${age}`);
    warm.request(1);
    warm.request(3);
    const keep = warm.keys();
    expect(keep.size).toBe(COMMON_WALL_PIECES.length * 2);
    expect(keep.has(`k${COMMON_WALL_PIECES[0]}a3`)).toBe(true);
  });
});
