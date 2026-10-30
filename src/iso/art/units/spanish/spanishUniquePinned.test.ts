import { pinUniqueUnit } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Spanish unique unit art (M8 Task 5b), split
 * like the civ's other unit pins (testing/pinnedArt.testkit.ts): pixels
 * must never change; geometry may be re-recorded when the sheet packing
 * changes, with the reason in the commit.
 */

pinUniqueUnit('spanish', 'conquistador', { pixels: 'd3f9fd05c3d01c61', geometry: '36f4725cd48db84a' });
