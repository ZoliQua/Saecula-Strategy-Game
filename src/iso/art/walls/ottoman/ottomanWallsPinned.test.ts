import { pinWalls } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Ottoman wall pieces: every common piece plus
 * junctions, crosses and diagonal joins of every age (see
 * testing/pinnedArt.testkit.ts). Recorded in M21 Task 5; M22 Task 3
 * re-recorded ages 2 and 3 (machicolated Rumeli towers, domed köşk bastions).
 */

pinWalls('ottoman', {
  1: '2f4751e4f84cafe8',
  2: '9d771c41f66a979e',
  3: '8cc9f784021b0a13',
});
