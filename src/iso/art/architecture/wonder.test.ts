import { describe, expect, it } from 'vitest';
import { WONDER_STAGES, wonderStage } from './wonder';

describe('wonderStage', () => {
  it('walks through every scaffolding stage as construction progresses', () => {
    const seen = new Set([0, 0.1, 0.3, 0.34, 0.5, 0.66, 0.67, 0.9, 0.999].map(wonderStage));
    expect([...seen].sort()).toEqual(Array.from({ length: WONDER_STAGES }, (_, i) => i + 1));
  });

  it('clamps progress outside 0..1', () => {
    expect(wonderStage(-1)).toBe(1);
    expect(wonderStage(1)).toBe(WONDER_STAGES);
    expect(wonderStage(5)).toBe(WONDER_STAGES);
  });
});
