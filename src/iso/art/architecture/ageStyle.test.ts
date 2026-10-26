import { describe, expect, it } from 'vitest';
import { ageArtKey, AGE_STYLED_BUILDINGS, artAgeFor, teamArtKey } from './ageStyle';

describe('age art keys', () => {
  it('keeps the base key for age 1', () => {
    expect(ageArtKey('building_house', 'house', 1)).toBe('building_house');
  });

  it('suffixes age-styled buildings with their age', () => {
    expect(ageArtKey('building_house', 'house', 2)).toBe('building_house~a2');
    expect(ageArtKey('building_town_center', 'town_center', 3)).toBe('building_town_center~a3');
  });

  it('falls back to age-1 art for single-style buildings', () => {
    for (const type of ['foundry', 'wonder'] as const) {
      expect(artAgeFor(type, 3)).toBe(1);
      expect(ageArtKey(`building_${type}`, type, 3)).toBe(`building_${type}`);
    }
  });

  it('covers the civic / economic / military buildings, towers and walls', () => {
    expect(AGE_STYLED_BUILDINGS).toHaveLength(11);
    expect(AGE_STYLED_BUILDINGS).toContain('tower');
    expect(AGE_STYLED_BUILDINGS).toContain('wall');
    expect(AGE_STYLED_BUILDINGS).not.toContain('wonder');
  });

  it('styles towers and wall icons per age', () => {
    expect(ageArtKey('building_tower', 'tower', 2)).toBe('building_tower~a2');
    expect(ageArtKey('building_wall', 'wall', 3)).toBe('building_wall~a3');
  });

  it('adds the team suffix after the age suffix', () => {
    expect(teamArtKey('building_barracks~a2', 1)).toBe('building_barracks~a2');
    expect(teamArtKey('building_barracks~a2', 3)).toBe('building_barracks~a2@p3');
  });
});
