import { describe, expect, it } from 'vitest';
import { RESOURCE_NODE_AMOUNT } from '../../config/balance';
import { createEcsWorld } from '../world';
import { createResourceNode } from './resource';

describe('createResourceNode', () => {
  it('creates a wood node with default amount', () => {
    const world = createEcsWorld();
    const e = createResourceNode(world, {
      tile: { tx: 3, ty: 4 },
      type: 'wood',
    });
    expect(e.position).toEqual({ tx: 3, ty: 4 });
    expect(e.resourceNode?.type).toBe('wood');
    expect(e.resourceNode?.amount).toBe(100);
    expect(e.resourceNode?.maxAmount).toBe(100);
  });

  it('honors a custom amount', () => {
    const world = createEcsWorld();
    const e = createResourceNode(world, {
      tile: { tx: 0, ty: 0 },
      type: 'gold',
      amount: 42,
    });
    expect(e.resourceNode?.amount).toBe(42);
    expect(e.resourceNode?.maxAmount).toBe(42);
  });

  it('gold and food nodes default to RESOURCE_NODE_AMOUNT (a berry bush holds 125 food, AoE)', () => {
    const world = createEcsWorld();
    const gold = createResourceNode(world, {
      tile: { tx: 1, ty: 1 },
      type: 'gold',
    });
    const food = createResourceNode(world, {
      tile: { tx: 2, ty: 2 },
      type: 'food',
    });
    expect(gold.resourceNode?.amount).toBe(RESOURCE_NODE_AMOUNT.gold);
    // Sized for three ages with the two start lodes (START_ECONOMY).
    expect(RESOURCE_NODE_AMOUNT.gold).toBe(300);
    expect(food.resourceNode?.amount).toBe(RESOURCE_NODE_AMOUNT.food);
    expect(RESOURCE_NODE_AMOUNT.food).toBe(125);
  });
});
