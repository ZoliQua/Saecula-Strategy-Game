import { describe, expect, it } from 'vitest';
import { AGE_STYLED_BUILDINGS, artAgeFor } from './ageStyle';

describe('age styles', () => {
  it('styles age-styled buildings in the owner age', () => {
    expect(artAgeFor('house', 2)).toBe(2);
    expect(artAgeFor('town_center', 3)).toBe(3);
  });

  it('falls back to age-1 art for single-style buildings', () => {
    for (const type of ['foundry', 'wonder'] as const) expect(artAgeFor(type, 3)).toBe(1);
  });

  it('covers the civic / economic / military buildings, towers and walls', () => {
    expect(AGE_STYLED_BUILDINGS).toHaveLength(11);
    expect(AGE_STYLED_BUILDINGS).toContain('tower');
    expect(AGE_STYLED_BUILDINGS).toContain('wall');
    expect(AGE_STYLED_BUILDINGS).not.toContain('wonder');
  });
});
