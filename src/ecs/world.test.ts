import { describe, expect, it } from 'vitest';
import { assignEntityId, createEcsWorld, peekNextEntityId, setNextEntityId } from './world';

describe('entity id counter', () => {
  it('peeks the next id and continues from a set one', () => {
    createEcsWorld();
    expect(peekNextEntityId()).toBe(1);
    expect(assignEntityId({}).id).toBe(1);
    expect(peekNextEntityId()).toBe(2);
    setNextEntityId(42);
    expect(assignEntityId({}).id).toBe(42);
    expect(peekNextEntityId()).toBe(43);
  });

  it('rejects ids that are not positive integers', () => {
    expect(() => setNextEntityId(0)).toThrow(RangeError);
    expect(() => setNextEntityId(1.5)).toThrow(RangeError);
  });
});
