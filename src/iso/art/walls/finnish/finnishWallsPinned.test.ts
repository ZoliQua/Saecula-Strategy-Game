import { pinWalls } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Finnish wall pieces: every common piece plus
 * junctions, crosses and diagonal joins of every age (see
 * testing/pinnedArt.testkit.ts). Recorded in M5 Task 14.
 */

pinWalls('finnish', {
  1: '77be4e6d866e2aa4',
  2: '528978d473992053',
  3: 'f5fc1d6387e94c98',
});
