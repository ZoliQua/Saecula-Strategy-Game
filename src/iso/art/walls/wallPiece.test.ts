import { describe, expect, it } from 'vitest';
import {
  wallNeighbourMaskBy,
  WALL_E,
  WALL_N,
  WALL_NE,
  WALL_NW,
  WALL_S,
  WALL_SE,
  WALL_SW,
  WALL_W,
} from '../../../game/wallNeighbours';
import { pieceArms, pieceHasPost, WALL_POST_EVERY, wallPiece } from './wallPiece';

describe('wallPiece', () => {
  it('a lone segment is a post with no arms', () => {
    const piece = wallPiece(0, 3, 3);
    expect(pieceArms(piece)).toBe(0);
    expect(pieceHasPost(piece)).toBe(true);
  });

  it('keeps cardinal joins and puts a post on corners, ends and junctions', () => {
    expect(pieceArms(wallPiece(WALL_N | WALL_E, 1, 1))).toBe(WALL_N | WALL_E);
    expect(pieceHasPost(wallPiece(WALL_N | WALL_E, 1, 1))).toBe(true);
    expect(pieceHasPost(wallPiece(WALL_E, 1, 1))).toBe(true);
    expect(pieceHasPost(wallPiece(WALL_E | WALL_W | WALL_S, 1, 1))).toBe(true);
  });

  it('drops a diagonal join when a cardinal next to it already joins (staircase corners)', () => {
    // Walls at (0,0), (1,0), (1,1): (0,0) sees E and SE, joins only E.
    expect(pieceArms(wallPiece(WALL_E | WALL_SE, 0, 0))).toBe(WALL_E);
    expect(pieceArms(wallPiece(WALL_S | WALL_SE | WALL_SW, 0, 0))).toBe(WALL_S);
    expect(pieceArms(wallPiece(WALL_N | WALL_NE | WALL_NW, 0, 0))).toBe(WALL_N);
    expect(pieceArms(wallPiece(WALL_W | WALL_NW, 0, 0))).toBe(WALL_W);
  });

  it('keeps diagonals with no cardinal beside them (45° runs)', () => {
    expect(pieceArms(wallPiece(WALL_NW | WALL_SE, 2, 2))).toBe(WALL_NW | WALL_SE);
    expect(pieceArms(wallPiece(WALL_NE | WALL_SW | WALL_E, 2, 2))).toBe(WALL_SW | WALL_E);
  });

  it('straight runs get a post every WALL_POST_EVERY tiles along the run', () => {
    const along = (mask: number, at: (i: number) => [number, number]) =>
      Array.from({ length: WALL_POST_EVERY * 2 }, (_, i) => pieceHasPost(wallPiece(mask, ...at(i)))).filter(Boolean).length;
    expect(along(WALL_E | WALL_W, (i) => [i, 7])).toBe(2);
    expect(along(WALL_N | WALL_S, (i) => [7, i])).toBe(2);
    expect(along(WALL_NE | WALL_SW, (i) => [i, 20 - i])).toBe(2);
    expect(along(WALL_NW | WALL_SE, (i) => [i, i])).toBe(2);
  });

  it('skips a rhythm post right next to a corner or end post (no double posts)', () => {
    // A run along tx from 0 to 6 at ty = 5, turning north at tx = 6: the corner (6,5) has a post,
    // so the rhythm post at tx = 4 stays, but one at the tile beside the corner would not.
    const walls = new Set(['0,5', '1,5', '2,5', '3,5', '4,5', '5,5', '6,5', '6,4', '6,3']);
    const isWall = (x: number, y: number) => walls.has(`${x},${y}`);
    const post = (x: number, y: number) => pieceHasPost(wallPiece(wallNeighbourMaskBy(isWall, { tx: x, ty: y }), x, y, isWall));
    expect(post(0, 5)).toBe(true); // end
    expect(post(6, 5)).toBe(true); // corner
    expect(post(4, 5)).toBe(true); // rhythm
    // Shift the run so the rhythm tile (tx = 4) sits next to the corner at tx = 5.
    const walls2 = new Set(['1,5', '2,5', '3,5', '4,5', '5,5', '5,4']);
    const isWall2 = (x: number, y: number) => walls2.has(`${x},${y}`);
    expect(pieceHasPost(wallPiece(wallNeighbourMaskBy(isWall2, { tx: 4, ty: 5 }), 4, 5, isWall2))).toBe(false);
    // Without the neighbour lookup the old rule still applies.
    expect(pieceHasPost(wallPiece(wallNeighbourMaskBy(isWall2, { tx: 4, ty: 5 }), 4, 5))).toBe(true);
  });

  it('pieces are small integers (texture key part)', () => {
    for (let mask = 0; mask < 256; mask++) {
      const piece = wallPiece(mask, mask % 5, mask % 7);
      expect(piece).toBeGreaterThanOrEqual(0);
      expect(piece).toBeLessThan(512);
    }
  });
});
