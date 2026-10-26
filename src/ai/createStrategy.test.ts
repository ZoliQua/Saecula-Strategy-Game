import { describe, expect, it } from 'vitest';
import { createStrategy } from './createStrategy';

describe('createStrategy', () => {
  it('honours the chosen difficulty (hard plays like medium until it exists)', () => {
    expect(createStrategy('easy').name).toBe('easy');
    expect(createStrategy('medium').name).toBe('medium');
    expect(createStrategy('hard').name).toBe('medium');
    expect(createStrategy('medium')).not.toBe(createStrategy('medium'));
  });
});
