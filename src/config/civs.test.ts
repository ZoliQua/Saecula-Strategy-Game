import { afterEach, describe, expect, it, vi } from 'vitest';
import { AVAILABLE_CIVS, CIV_DEFS, CIV_IDS, DEV_ALL_CIVS } from './civs';

describe('civ registry', () => {
  it('lists all eight civs', () => {
    expect(CIV_IDS).toEqual(['hungarian', 'english', 'german', 'french', 'spanish', 'italian', 'russian', 'finnish']);
    expect(Object.keys(CIV_DEFS).sort()).toEqual([...CIV_IDS].sort());
  });

  it('makes Hungarian and English available, the other six not', () => {
    expect(AVAILABLE_CIVS).toEqual(['hungarian', 'english']);
    for (const id of CIV_IDS) expect(CIV_DEFS[id].available).toBe(id === 'hungarian' || id === 'english');
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
    // Upcoming civs stay stubs: Hungarian art under their own keys.
    expect(civs.CIV_DEFS.german.available).toBe(false);
    expect(civs.CIV_DEFS.german.architecture).toEqual(civs.CIV_DEFS.hungarian.architecture);
  });

  it('ignores other query strings', async () => {
    vi.stubGlobal('location', { search: '?civs=some' });
    vi.resetModules();
    const civs = await import('./civs');
    expect(civs.DEV_ALL_CIVS).toBe(false);
    expect(civs.AVAILABLE_CIVS).toEqual(['hungarian', 'english']);
  });
});
