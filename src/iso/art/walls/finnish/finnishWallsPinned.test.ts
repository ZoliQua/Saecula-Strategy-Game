import { pinWalls } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Finnish wall pieces: every common piece plus
 * junctions, crosses and diagonal joins of every age (see
 * testing/pinnedArt.testkit.ts). Recorded in M5 Task 14; the polish
 * round re-recorded age 3 (darker turf, sod edge, paler cordon).
 */

pinWalls('finnish', {
  1: '77be4e6d866e2aa4',
  2: '528978d473992053',
  3: '16c72c836c1e9368',
});
