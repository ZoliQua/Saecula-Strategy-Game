import { describe, expect, it } from 'vitest';
import { buildingOutlineDepth, styleAge } from './renderPlacement';

describe('styleAge', () => {
  it("shows the owner's age, raised to the building's minimum (fortress stone walls)", () => {
    expect(styleAge(1, undefined)).toBe(1);
    expect(styleAge(1, 2)).toBe(2);
    expect(styleAge(2, 2)).toBe(2);
    expect(styleAge(3, 2)).toBe(3);
  });
});

describe('buildingOutlineDepth', () => {
  it('keeps the selection outline under a building sunk below raised rock (CliffBuildingSort), not just under its front tile', () => {
    // A Wonder at (10, 20): front tile 36 → drawn at 36.2; beside rock at tile sum 34 it sinks to 34.01.
    expect(buildingOutlineDepth(36.2)).toBeCloseTo(35.9); // as before: front tile − 0.1
    expect(buildingOutlineDepth(34.01)).toBeLessThan(34.01);
    expect(buildingOutlineDepth(34.01)).toBeGreaterThan(34.01 - 0.5);
  });
});
