import { describe, expect, it } from 'vitest';
import { ANIM_FRAMES, PAINTED_HEADINGS } from '../layout';
import { UNIT_TYPES, unitGeometryHash, unitPixelsHash } from '../../testing/unitPins';

/*
 * Pixel-identity guard for the English unit art (M4 final review M1). Split pins
 * (M5 Task 1), see testing/unitPins.ts:
 *  - PIXELS: every frame's posed figure (primitives, materials) and its
 *    rasterized pixels (albedo, team mask, normals, coverage) in the
 *    frame's logical box. Must never change.
 *  - GEOMETRY: sheet size and frame placement; may be re-recorded when the
 *    sheet packing changes, with the reason in the commit.
 * The combined pin (recorded at 39e00c4) was green at a0333bc, where both
 * split hashes were recorded.
 */

const PIXELS: Record<string, string> = {
  villager: '1a68ab762c4aa841',
  swordsman: '3f0e939489b2d184',
  archer: 'ae2eae7514baa863',
  pikeman: '338e04237a33829d',
  crossbowman: '75eeb4f78407bd83',
  musketeer: 'efda6def25aaed7c',
  scout: '82e5522cd336c5f6',
  knight: 'a882855b2204d368',
  cavalry: 'eb4ae68b545aae35',
  cannon: 'b073fad877daa993',
};

const GEOMETRY: Record<string, string> = {
  villager: 'c31d36cf942b156e',
  swordsman: '50846f7867cdda6d',
  archer: 'c1221b62e4dc87b1',
  pikeman: 'd9236b76925f9c09',
  crossbowman: '9331463212e28553',
  musketeer: '95daee1b42e69447',
  scout: '4d15b3bf7cefd817',
  knight: 'f5511b517ee29d21',
  cavalry: '59cb4b8b772fd839',
  cannon: 'c45260b327386e57',
};

describe('English unit art stays pixel-identical', () => {
  it('paints five headings', () => {
    expect(PAINTED_HEADINGS.length).toBe(5);
    expect(ANIM_FRAMES.walk).toBe(6);
  });

  it.each(UNIT_TYPES)('%s pixels', (type) => {
    const hash = unitPixelsHash(type, 'english');
    if (process.env.PRINT_ART_HASHES) console.log(`  ${type}: '${hash}',`);
    expect(hash).toBe(PIXELS[type]);
  });

  it.each(UNIT_TYPES)('%s sheet geometry', (type) => {
    const hash = unitGeometryHash(type, 'english');
    if (process.env.PRINT_ART_HASHES) console.log(`  ${type}: '${hash}',`);
    expect(hash).toBe(GEOMETRY[type]);
  });
});
