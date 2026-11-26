import { pinWalls } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Ottoman wall pieces: every common piece plus
 * junctions, crosses and diagonal joins of every age (see
 * testing/pinnedArt.testkit.ts). Recorded in M21 Task 5.
 */

pinWalls('ottoman', {
  1: '2f4751e4f84cafe8',
  2: '97c4f675dfdabab1',
  3: 'd4d98f44efba8a50',
});
