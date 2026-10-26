import { describe, expect, it } from 'vitest';
import { planWallSegments, wallLineTiles } from './wallLine';
import { WALL_E, WALL_N, WALL_NW, WALL_S, WALL_W, wallNeighbourMask, wallNeighbourMaskBy } from './wallNeighbours';

const t = (tx: number, ty: number) => ({ tx, ty });

describe('wallLineTiles', () => {
  it('returns the single start tile for a zero-length drag', () => {
    expect(wallLineTiles(t(4, 4), t(4, 4))).toEqual([t(4, 4)]);
  });

  it('lays an axis-aligned line including both endpoints', () => {
    expect(wallLineTiles(t(2, 3), t(5, 3))).toEqual([t(2, 3), t(3, 3), t(4, 3), t(5, 3)]);
    expect(wallLineTiles(t(2, 3), t(2, 1))).toEqual([t(2, 3), t(2, 2), t(2, 1)]);
  });

  it('lays a 45 degree diagonal line', () => {
    expect(wallLineTiles(t(1, 1), t(4, 4))).toEqual([t(1, 1), t(2, 2), t(3, 3), t(4, 4)]);
    expect(wallLineTiles(t(5, 1), t(3, 3))).toEqual([t(5, 1), t(4, 2), t(3, 3)]);
  });

  it('snaps a shallow drag to the dominant axis', () => {
    expect(wallLineTiles(t(0, 0), t(6, 1))).toEqual(
      [0, 1, 2, 3, 4, 5, 6].map((x) => t(x, 0)),
    );
  });

  it('snaps an in-between drag to a diagonal cut at the shorter axis', () => {
    expect(wallLineTiles(t(0, 0), t(5, 3))).toEqual([t(0, 0), t(1, 1), t(2, 2), t(3, 3)]);
  });
});

describe('wall neighbour mask', () => {
  it('is zero for an isolated wall and sets bits per neighbour', () => {
    const walls = new Set(['3,3', '4,3', '3,4', '2,2']);
    const has = (x: number, y: number) => walls.has(`${x},${y}`);
    expect(wallNeighbourMaskBy(() => false, t(3, 3))).toBe(0);
    expect(wallNeighbourMaskBy(has, t(3, 3))).toBe(WALL_E | WALL_S | WALL_NW);
    expect(wallNeighbourMaskBy(has, t(4, 3)) & 0x0f).toBe(WALL_W);
  });

  it('counts only the owner live walls from world entities', () => {
    const wall = (tx: number, ty: number, playerId: number, dying?: object) => ({
      position: t(tx, ty),
      building: { type: 'wall' as const },
      owner: { playerId },
      ...(dying ? { dying } : {}),
    });
    const entities = [
      wall(5, 4, 1), // N of (5,5)
      wall(6, 5, 2), // E but enemy
      wall(5, 6, 1, { ttlMs: 1 }), // S but dying
      { position: t(4, 5), building: { type: 'house' as const }, owner: { playerId: 1 } },
    ];
    expect(wallNeighbourMask(entities, t(5, 5), 1)).toBe(WALL_N);
  });
});

describe('planWallSegments', () => {
  const line = wallLineTiles(t(0, 0), t(5, 0));

  it('skips occupied tiles but builds the rest', () => {
    const plan = planWallSegments(line, (x) => x.tx !== 2, 100, 5);
    expect(plan.build.map((x) => x.tx)).toEqual([0, 1, 3, 4, 5]);
    expect(plan.blocked).toEqual([t(2, 0)]);
    expect(plan.unaffordable).toEqual([]);
  });

  it('charges only for what the wood covers, in line order', () => {
    const plan = planWallSegments(line, () => true, 12, 5);
    expect(plan.build.map((x) => x.tx)).toEqual([0, 1]);
    expect(plan.unaffordable.map((x) => x.tx)).toEqual([2, 3, 4, 5]);
  });
});
