import { pinUniqueUnit } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the winged hussar (M21 Task 3), split like the
 * civ's other unit pins (testing/pinnedArt.testkit.ts): pixels must never
 * change; geometry may be re-recorded when the sheet packing changes,
 * with the reason in the commit.
 */

pinUniqueUnit('polish', 'winged_hussar', { pixels: 'c5c4cad8e3366ada', geometry: '8ed309fa34fff668' });
