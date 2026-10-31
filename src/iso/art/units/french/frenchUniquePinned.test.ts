import { pinUniqueUnit } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the French unique unit art (M8 Task 5), split
 * like the civ's other unit pins (testing/pinnedArt.testkit.ts): pixels
 * must never change; geometry may be re-recorded when the sheet packing
 * changes, with the reason in the commit.
 */

pinUniqueUnit('french', 'mousquetaire', { pixels: '3b89d05dc7a58e21', geometry: '0c979dfc5f9a8098' });
