import { pinUniqueUnit } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Russian unique unit art (M8 Task 5b), split
 * like the civ's other unit pins (testing/pinnedArt.testkit.ts): pixels
 * must never change; geometry may be re-recorded when the sheet packing
 * changes, with the reason in the commit.
 */

pinUniqueUnit('russian', 'cossack', { pixels: '632a4ab573655fa4', geometry: '52945648621bf2f9' });
