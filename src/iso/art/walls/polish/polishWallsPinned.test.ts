import { pinWalls } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Polish wall pieces: every common piece plus
 * junctions, crosses and diagonal joins of every age (see
 * testing/pinnedArt.testkit.ts). Recorded in M21 Task 3.
 */

pinWalls('polish', {
  1: '4baf2c33d4131957',
  2: '4ad5ca62c7a71c2d',
  3: '4083f111dd17cd9e',
});
