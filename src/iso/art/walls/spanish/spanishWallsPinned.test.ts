import { pinWalls } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Spanish wall pieces: every common piece plus
 * junctions, crosses and diagonal joins of every age (see
 * testing/pinnedArt.testkit.ts). Recorded in M5 Task 8.
 */

pinWalls('spanish', {
  1: 'f1b6cda5c6e061bd',
  2: '8dd6052e5922bf04',
  3: '3f08d45a78848c5c',
});
