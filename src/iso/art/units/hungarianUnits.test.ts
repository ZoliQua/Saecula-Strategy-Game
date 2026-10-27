import { describe, expect, it } from 'vitest';
import { ANIM_FRAMES, PAINTED_HEADINGS } from './layout';
import { UNIT_TYPES, unitGeometryHash, unitPixelsHash } from './../testing/unitPins';

/*
 * Pixel-identity guard for the Hungarian unit art (M4 Task 5). Split pins
 * (M5 Task 1), see testing/unitPins.ts:
 *  - PIXELS: every frame's posed figure (primitives, materials) and its
 *    rasterized pixels (albedo, team mask, normals, coverage) in the
 *    frame's logical box. Must never change.
 *  - GEOMETRY: sheet size and frame placement; may be re-recorded when the
 *    sheet packing changes, with the reason in the commit.
 * The combined pin (recorded at 8c43c49) was green at a0333bc, where both
 * split hashes were recorded.
 */

const PIXELS: Record<string, string> = {
  villager: '4f36bdaa383f0198',
  swordsman: '1cc071e1b1aad295',
  archer: 'c97fd185c0bc5e6e',
  pikeman: 'aaede629f15913cb',
  crossbowman: '18993cc3a0d1901a',
  musketeer: 'c658a85a0587237b',
  scout: '7fa68216f003b13c',
  knight: 'f08ed4eab029c498',
  cavalry: 'aa14e6b22c88ec3e',
  cannon: '633a6bd99642dc6c',
};

const GEOMETRY: Record<string, string> = {
  villager: '77164c3b906fa27e',
  swordsman: 'c062a4ed690dbf1b',
  archer: '9303a8713019fd07',
  pikeman: 'dfa11fe17e9ad6b0',
  crossbowman: 'b78bb51429a72bdb',
  musketeer: 'd83d5a5d8c9afb3a',
  scout: 'f56907e93d14b30b',
  knight: 'f5511b517ee29d21',
  cavalry: '254d9dc94b9181ce',
  cannon: 'c45260b327386e57',
};

describe('Hungarian unit art stays pixel-identical', () => {
  it('paints five headings', () => {
    expect(PAINTED_HEADINGS.length).toBe(5);
    expect(ANIM_FRAMES.walk).toBe(6);
  });

  it.each(UNIT_TYPES)('%s pixels', (type) => {
    const hash = unitPixelsHash(type, 'hungarian');
    if (process.env.PRINT_ART_HASHES) console.log(`  ${type}: '${hash}',`);
    expect(hash).toBe(PIXELS[type]);
  });

  it.each(UNIT_TYPES)('%s sheet geometry', (type) => {
    const hash = unitGeometryHash(type, 'hungarian');
    if (process.env.PRINT_ART_HASHES) console.log(`  ${type}: '${hash}',`);
    expect(hash).toBe(GEOMETRY[type]);
  });
});
