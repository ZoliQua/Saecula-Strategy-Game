import { pinUnits } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the English unit art (M4 final review M1). Split pins
 * (M5 Task 1), see testing/pinnedArt.testkit.ts:
 *  - pixels: every frame's posed figure (primitives, materials) and its
 *    rasterized pixels (albedo, team mask, normals, coverage) in the
 *    frame's logical box. Must never change.
 *  - geometry: sheet size and frame placement; may be re-recorded when the
 *    sheet packing changes, with the reason in the commit.
 * geometry re-recorded in M5 Task 1 (frames packed per frame); pixels unchanged.
 * The combined pin (recorded at 39e00c4) was green at a0333bc, where both
 * split hashes were recorded.
 */

pinUnits('english', {
  pixels: {
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
  },
  geometry: {
    villager: 'cc277539c06caaab',
    swordsman: '2bd925661da296a5',
    archer: '6c22c2783b6928bd',
    pikeman: 'e5625e5b98713d35',
    crossbowman: '30c18ee7f67000ab',
    musketeer: 'b01da7133e7e5939',
    scout: '4740cc400937c5a5',
    knight: 'e6b5202492f12aec',
    cavalry: 'c53ff3fcbde77806',
    cannon: '10be5a8ab9cb6fec',
  },
});
