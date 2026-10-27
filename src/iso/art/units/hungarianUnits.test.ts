import { describe, expect, it } from 'vitest';
import { ANIM_FRAMES, PAINTED_HEADINGS } from './layout';
import { UNIT_TYPES, unitGeometryHash, unitPixelsHash } from '../testing/unitPins';

/*
 * Pixel-identity guard for the Hungarian unit art (M4 Task 5). Split pins
 * (M5 Task 1), see testing/unitPins.ts:
 *  - PIXELS: every frame's posed figure (primitives, materials) and its
 *    rasterized pixels (albedo, team mask, normals, coverage) in the
 *    frame's logical box. Must never change.
 *  - GEOMETRY: sheet size and frame placement; may be re-recorded when the
 *    sheet packing changes, with the reason in the commit.
 * GEOMETRY re-recorded in M5 Task 1 (frames packed per frame); PIXELS unchanged.
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
  villager: '582d580c5abcd21e',
  swordsman: '3174821ca508f2f9',
  archer: '0667f61227405596',
  pikeman: 'd6f9ef7cf6dfc7f7',
  crossbowman: '70334895d60c43c7',
  musketeer: '145695a2f2678038',
  scout: '115fb9cca17ed168',
  knight: 'c216f40c2edf1803',
  cavalry: '36e006e79240fa23',
  cannon: '10be5a8ab9cb6fec',
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
