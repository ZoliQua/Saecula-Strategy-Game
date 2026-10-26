import { describe, expect, it } from 'vitest';
import type { Entity } from '../ecs/components';
import { findBreachTarget, tileDistanceToEntity } from './breach';

const wall = (tx: number, ty: number, playerId: number, extra: Partial<Entity> = {}): Entity => ({
  position: { tx, ty },
  building: { type: 'wall', footprint: { width: 1, height: 1 } },
  owner: { playerId },
  health: { current: 300, max: 300 },
  ...extra,
});
const target: Entity & { position: { tx: number; ty: number } } = {
  position: { tx: 10, ty: 5 },
  building: { type: 'house', footprint: { width: 2, height: 2 } },
  owner: { playerId: 2 },
  health: { current: 500, max: 500 },
};

describe('findBreachTarget', () => {
  it('measures distance to the nearest footprint tile', () => {
    expect(tileDistanceToEntity({ tx: 7, ty: 6 }, target)).toBe(3);
    expect(tileDistanceToEntity({ tx: 11, ty: 6 }, target)).toBe(0);
  });

  it('picks the nearby hostile wall closest to the real target', () => {
    const near = wall(6, 5, 2);
    const towardGoal = wall(7, 5, 2);
    const result = findBreachTarget([near, towardGoal, target], { tx: 5, ty: 5 }, target, 1, 2);
    expect(result).toEqual({ kind: 'attack', target: towardGoal });
  });

  it('skips own and Gaia buildings, distant ones and the target itself', () => {
    const found = findBreachTarget(
      [wall(6, 5, 1), wall(6, 6, 0), wall(9, 9, 2), target],
      { tx: 5, ty: 5 },
      target,
      1,
      2,
    );
    expect(found).toBeNull();
  });

  it('waits while a blocking building is collapsing', () => {
    const result = findBreachTarget([wall(6, 5, 2, { dying: { ttlMs: 500 } }), wall(6, 6, 2)], { tx: 5, ty: 5 }, target, 1, 2);
    expect(result).toEqual({ kind: 'wait' });
  });
});
