import { pinWalls } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the French wall pieces: every common piece plus
 * junctions, crosses and diagonal joins of every age (see
 * testing/pinnedArt.testkit.ts). Recorded in M5 Task 6.
 */

pinWalls('french', {
  1: '4d9760dd3f454651',
  2: '258079da2dea44c4',
  3: '8c2a787e2fd3e735',
});
