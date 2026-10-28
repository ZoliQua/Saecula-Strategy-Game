import { pinWalls } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Russian wall pieces: every common piece plus
 * junctions, crosses and diagonal joins of every age (see
 * testing/pinnedArt.testkit.ts). Recorded in M5 Task 12; the polish
 * round re-recorded age 2 (an open lookout on posts under each tent).
 */

pinWalls('russian', {
  1: '9071259d7852875d',
  2: 'ffce137118b7897b',
  3: 'a6e09fa1d3759569',
});
