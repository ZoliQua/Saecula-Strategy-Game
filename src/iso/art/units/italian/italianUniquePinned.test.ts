import { pinUniqueUnit } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Italian unique unit art (M8 Task 5b), split
 * like the civ's other unit pins (testing/pinnedArt.testkit.ts): pixels
 * must never change; geometry may be re-recorded when the sheet packing
 * changes, with the reason in the commit.
 */

pinUniqueUnit('italian', 'legionary', { pixels: '1d544d01d52e5036', geometry: '5c4b945670c5e7e3' });
