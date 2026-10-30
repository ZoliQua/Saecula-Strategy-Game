import { pinUniqueUnit } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Hungarian unique unit art (M8 Task 5), split
 * like the civ's other unit pins (testing/pinnedArt.testkit.ts): pixels
 * must never change; geometry may be re-recorded when the sheet packing
 * changes, with the reason in the commit.
 */

pinUniqueUnit('hungarian', 'hussar', { pixels: 'f9d2ada3d65e5041', geometry: 'd147f8f96aa6df6f' });
