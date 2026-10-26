import { describe, expect, it } from 'vitest';
import { styleAge } from './renderPlacement';

describe('styleAge', () => {
  it("shows the owner's age, raised to the building's minimum (fortress stone walls)", () => {
    expect(styleAge(1, undefined)).toBe(1);
    expect(styleAge(1, 2)).toBe(2);
    expect(styleAge(2, 2)).toBe(2);
    expect(styleAge(3, 2)).toBe(3);
  });
});
