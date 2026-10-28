import { pinWalls } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Italian wall pieces: every common piece plus
 * junctions, crosses and diagonal joins of every age (see
 * testing/pinnedArt.testkit.ts). Recorded in M5 Task 10; the polish round
 * re-recorded ages 1 (yellower tufa) and 2 (deeper forks, dark notch copings).
 */

pinWalls('italian', {
  1: 'b322c4fedc736024',
  2: 'b3316a449814eddb',
  3: '1a7f46c391bf9f4a',
});
