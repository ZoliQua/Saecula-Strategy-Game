import { pinUniqueUnit } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Hungarian unique unit art (M8 Task 5), split
 * like the civ's other unit pins (testing/pinnedArt.testkit.ts): pixels
 * must never change; geometry may be re-recorded when the sheet packing
 * changes, with the reason in the commit.
 */

pinUniqueUnit('hungarian', 'hussar', { pixels: 'ff8a3065505e48f9', geometry: '52826c6a591a979b' });
