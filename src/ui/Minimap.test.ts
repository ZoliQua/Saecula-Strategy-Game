import { describe, expect, it } from 'vitest';
import { minimapShows } from './Minimap';

describe('minimapShows (M16)', () => {
  const friendly = (id: number) => id === 1 || id === 2;

  it("always shows the human's and its allies' entities, others only when visible", () => {
    expect(minimapShows(1, friendly, () => false)).toBe(true);
    expect(minimapShows(2, friendly, () => false)).toBe(true);
    expect(minimapShows(3, friendly, () => false)).toBe(false);
    expect(minimapShows(3, friendly, () => true)).toBe(true);
    expect(minimapShows(0, friendly, () => false)).toBe(false);
  });
});
