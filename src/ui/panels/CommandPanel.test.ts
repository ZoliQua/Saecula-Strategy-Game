import { describe, expect, it } from 'vitest';
import { missingResource } from './CommandPanel';

describe('missingResource', () => {
  it('returns null when everything is affordable', () => {
    expect(missingResource({ food: 50, wood: 50, gold: 0 }, { food: 50, wood: 0, gold: 0 })).toBeNull();
  });

  it('reports the first missing resource', () => {
    expect(missingResource({ food: 10, wood: 0, gold: 0 }, { food: 0, wood: 30, gold: 0 })).toBe('wood');
    expect(missingResource({ food: 0, wood: 0, gold: 0 }, { food: 5, wood: 5, gold: 5 })).toBe('food');
  });
});
