import { pinUniqueUnit } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Finnish unique unit art (M8 Task 5b), split
 * like the civ's other unit pins (testing/pinnedArt.testkit.ts): pixels
 * must never change; geometry may be re-recorded when the sheet packing
 * changes, with the reason in the commit.
 */

pinUniqueUnit('finnish', 'sissi', { pixels: '28ffb9a11171ce5a', geometry: '79f4af6aed4d4150' });
