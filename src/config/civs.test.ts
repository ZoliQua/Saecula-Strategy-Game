import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CivId } from '../types';
import { AVAILABLE_CIVS, CIV_DEFS, CIV_IDS, DEV_ALL_CIVS, MENU_CIV, menuDioramaCivs } from './civs';

describe('civ registry', () => {
  it('lists all eight civs', () => {
    expect(CIV_IDS).toEqual(['hungarian', 'english', 'german', 'french', 'spanish', 'italian', 'russian', 'finnish']);
    expect(Object.keys(CIV_DEFS).sort()).toEqual([...CIV_IDS].sort());
  });

  it('makes Hungarian, English, German and French available, the other four not', () => {
    const done = ['hungarian', 'english', 'german', 'french'];
    expect(AVAILABLE_CIVS).toEqual(done);
    for (const id of CIV_IDS) expect(CIV_DEFS[id].available).toBe(done.includes(id));
  });

  it('gives French its own architecture, walls and unit look in every age', () => {
    expect(CIV_DEFS.french.architecture).toEqual({ 1: 'gallo_roman', 2: 'gothic_fr', 3: 'classicisme' });
    expect(CIV_DEFS.french.wallStyle).toEqual({ 1: 'murus_gallicus', 2: 'pepperpot_curtain', 3: 'vauban' });
    expect(CIV_DEFS.french.unitLook).toBe('french');
  });

  it('gives German its own architecture, walls and unit look in every age', () => {
    expect(CIV_DEFS.german.architecture).toEqual({ 1: 'limes', 2: 'fachwerk', 3: 'backstein' });
    expect(CIV_DEFS.german.wallStyle).toEqual({ 1: 'limes_palisade', 2: 'backstein_curtain', 3: 'sandstone_fort' });
    expect(CIV_DEFS.german.unitLook).toBe('german');
  });

  it('gives English its own architecture, walls and unit look in every age', () => {
    expect(CIV_DEFS.english.architecture).toEqual({ 1: 'romano_british', 2: 'tudor', 3: 'georgian' });
    expect(CIV_DEFS.english.wallStyle).toEqual({ 1: 'bank_palisade', 2: 'norman_curtain', 3: 'star_fort' });
    expect(CIV_DEFS.english.unitLook).toBe('english');
    expect(CIV_DEFS.hungarian.wallStyle).toEqual({ 1: 'palisade', 2: 'curtain', 3: 'bastion' });
    expect(CIV_DEFS.hungarian.unitLook).toBe('hungarian');
  });

  it('gives every civ a style for each age', () => {
    for (const id of CIV_IDS) {
      expect(Object.keys(CIV_DEFS[id].architecture)).toEqual(['1', '2', '3']);
      expect(Object.keys(CIV_DEFS[id].wallStyle)).toEqual(['1', '2', '3']);
    }
  });

  it('keeps the dev all-civs stub off without ?civs=all (tests, production)', () => {
    expect(DEV_ALL_CIVS).toBe(false);
  });
});

describe('dev all-civs stub (?civs=all)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('makes every civ available in a dev build with ?civs=all', async () => {
    vi.stubGlobal('location', { search: '?civs=all' });
    vi.resetModules();
    const civs = await import('./civs');
    expect(civs.DEV_ALL_CIVS).toBe(true);
    expect(civs.AVAILABLE_CIVS).toEqual(civs.CIV_IDS);
    // Civs without art yet stay stubs: Hungarian art under their own keys.
    expect(civs.CIV_DEFS.italian.available).toBe(false);
    expect(civs.CIV_DEFS.italian.architecture).toEqual(civs.CIV_DEFS.hungarian.architecture);
  });

  it('ignores other query strings', async () => {
    vi.stubGlobal('location', { search: '?civs=some' });
    vi.resetModules();
    const civs = await import('./civs');
    expect(civs.DEV_ALL_CIVS).toBe(false);
    expect(civs.AVAILABLE_CIVS).toEqual(['hungarian', 'english', 'german', 'french']);
  });
});

describe('menuDioramaCivs', () => {
  it('pairs the menu civ with the other playable civs today, one per visit', () => {
    expect([0, 1, 2, 3].map((visit) => menuDioramaCivs(visit))).toEqual([
      [MENU_CIV, 'english'],
      [MENU_CIV, 'german'],
      [MENU_CIV, 'french'],
      [MENU_CIV, 'english'],
    ]);
  });

  it('cycles through every other civ of the pool, visit by visit, and never shows the menu civ twice', () => {
    const pool: readonly CivId[] = CIV_IDS;
    const seconds = Array.from({ length: 14 }, (_, v) => menuDioramaCivs(v, pool));
    for (const [front, back] of seconds) {
      expect(front).toBe(MENU_CIV);
      expect(back).not.toBe(MENU_CIV);
    }
    const others = CIV_IDS.filter((c) => c !== MENU_CIV);
    expect(seconds.slice(0, 7).map(([, b]) => b)).toEqual(others);
    expect(seconds.slice(7).map(([, b]) => b)).toEqual(others);
  });

  it('still shows two different civs when the menu civ is the only one in the pool', () => {
    const [front, back] = menuDioramaCivs(3, [MENU_CIV]);
    expect(front).toBe(MENU_CIV);
    expect(back).not.toBe(MENU_CIV);
  });
});
