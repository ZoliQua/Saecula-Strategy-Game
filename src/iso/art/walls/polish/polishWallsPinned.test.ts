import { pinWalls } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Polish wall pieces: every common piece plus
 * junctions, crosses and diagonal joins of every age (see
 * testing/pinnedArt.testkit.ts). Recorded in M21 Task 3; M22 Task 3
 * re-recorded age 3 (the attic-crested Zamość bastion).
 */

pinWalls('polish', {
  1: '4baf2c33d4131957',
  2: '4ad5ca62c7a71c2d',
  3: 'dd80e4697199c499',
});
