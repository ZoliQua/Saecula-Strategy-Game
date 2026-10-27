import { pinWalls } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the English wall pieces (M4 final review M1): every
 * common piece plus junctions, crosses and diagonal joins of every age (see
 * testing/pinnedArt.testkit.ts). Recorded at 39e00c4 (end of M4).
 */

pinWalls('english', {
  1: '71f39c13ca2fbf96',
  2: '0020fbd4c20fce03',
  3: '4dea68629f9c693e',
});
