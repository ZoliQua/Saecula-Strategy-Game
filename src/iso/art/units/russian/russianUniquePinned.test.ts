import { pinUniqueUnit } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Russian unique unit art (M8 Task 5b), split
 * like the civ's other unit pins (testing/pinnedArt.testkit.ts): pixels
 * must never change; geometry may be re-recorded when the sheet packing
 * changes, with the reason in the commit.
 */

pinUniqueUnit('russian', 'cossack', { pixels: '48277cfc9d16d1f1', geometry: 'd23bfac43249f502' });
