import { describe, expect, it } from 'vitest';
import { AVAILABLE_CIVS, CIV_IDS } from '../config/civs';
import { hu } from './hu';

describe('hu.menu.civCount', () => {
  it('names only the civ count once every civ is playable', () => {
    expect(hu.menu.civCount(8, 0)).toBe('8 nép');
  });

  it('adds the civs still to come', () => {
    expect(hu.menu.civCount(2, 6)).toBe('2 nép · 6 hamarosan');
    expect(hu.menu.civCount(5, 3)).toBe('5 nép · 3 hamarosan');
  });

  it('feeds the menu feature line', () => {
    expect(hu.menu.features(2, 6)).toEqual(['3 történelmi kor', '2 nép · 6 hamarosan', 'AI ellenfelek']);
    expect(hu.menu.features(8, 0)[1]).toBe('8 nép');
  });

  it('reads "10 nép" with nothing to come on the main menu today (the counts MainMenu passes)', () => {
    expect(hu.menu.features(AVAILABLE_CIVS.length, CIV_IDS.length - AVAILABLE_CIVS.length)[1]).toBe('10 nép');
  });
});
