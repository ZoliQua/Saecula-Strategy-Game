import { describe, expect, it } from 'vitest';
import type { Entity } from '../components';
import { faceToward } from './facing';

const unitAt = (tx: number, ty: number): Entity => ({
  position: { tx, ty },
  movable: { speed: 1, path: [], progress: 0, facing: 'S' },
});

describe('faceToward', () => {
  it('faces a unit target along the tile compass', () => {
    const u = unitAt(5, 5);
    faceToward(u, { position: { tx: 6, ty: 5 } });
    expect(u.movable?.facing).toBe('E');
    faceToward(u, { position: { tx: 4, ty: 4 } });
    expect(u.movable?.facing).toBe('NW');
  });

  it('faces the centre of a building footprint', () => {
    const u = unitAt(2, 6);
    // 3×3 building at (2,2)..(4,4): centre (3,3) lies N-NE; nearest octant is N.
    faceToward(u, { position: { tx: 2, ty: 2 }, building: { type: 'barracks', footprint: { width: 3, height: 3 } } });
    expect(u.movable?.facing).toBe('N');
  });

  it('keeps the heading when the target is on the same tile', () => {
    const u = unitAt(1, 1);
    faceToward(u, { position: { tx: 1, ty: 1 } });
    expect(u.movable?.facing).toBe('S');
  });
});
