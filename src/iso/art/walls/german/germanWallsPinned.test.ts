import { pinWalls } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the German wall pieces: every common piece plus
 * junctions, crosses and diagonal joins of every age (see
 * testing/pinnedArt.testkit.ts). Recorded in M5 Task 4.
 */

pinWalls('german', {
  1: '59e0f19897576561',
  2: 'd37b537f6e10777b',
  3: 'b3386030ca17d63c',
});
