import { pinUniqueUnit } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the janissary (M21 Task 5), split like the
 * civ's other unit pins (testing/pinnedArt.testkit.ts): pixels must never
 * change; geometry may be re-recorded when the sheet packing changes,
 * with the reason in the commit.
 */

pinUniqueUnit('ottoman', 'janissary', { pixels: 'fa820eb27e5147f9', geometry: '86a006b2d29234d8' });
