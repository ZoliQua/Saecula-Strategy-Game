import { describe, expect, it } from 'vitest';
import { AVAILABLE_CIVS, CIV_DEFS, CIV_IDS } from './civs';

describe('civ registry', () => {
  it('lists all eight civs', () => {
    expect(CIV_IDS).toEqual(['hungarian', 'english', 'german', 'french', 'spanish', 'italian', 'russian', 'finnish']);
    expect(Object.keys(CIV_DEFS).sort()).toEqual([...CIV_IDS].sort());
  });

  it('makes Hungarian and English available, the other six not', () => {
    expect(AVAILABLE_CIVS).toEqual(['hungarian', 'english']);
    for (const id of CIV_IDS) expect(CIV_DEFS[id].available).toBe(id === 'hungarian' || id === 'english');
  });

  it('resolves English to the Hungarian styles until its own art lands', () => {
    expect(CIV_DEFS.english.architecture).toEqual(CIV_DEFS.hungarian.architecture);
    expect(CIV_DEFS.english.wallStyle).toEqual(CIV_DEFS.hungarian.wallStyle);
    expect(CIV_DEFS.english.unitLook).toBe(CIV_DEFS.hungarian.unitLook);
  });

  it('gives every civ a style for each age', () => {
    for (const id of CIV_IDS) {
      expect(Object.keys(CIV_DEFS[id].architecture)).toEqual(['1', '2', '3']);
      expect(Object.keys(CIV_DEFS[id].wallStyle)).toEqual(['1', '2', '3']);
    }
  });
});
