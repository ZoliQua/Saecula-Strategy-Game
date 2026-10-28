import { pinWalls } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Italian wall pieces: every common piece plus
 * junctions, crosses and diagonal joins of every age (see
 * testing/pinnedArt.testkit.ts). Recorded in M5 Task 10.
 */

pinWalls('italian', {
  1: '153b1e17529e03cf',
  2: '732a350cedb5191b',
  3: '1a7f46c391bf9f4a',
});
