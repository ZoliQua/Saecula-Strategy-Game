import { pinWalls } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Russian wall pieces: every common piece plus
 * junctions, crosses and diagonal joins of every age (see
 * testing/pinnedArt.testkit.ts). Recorded in M5 Task 12.
 */

pinWalls('russian', {
  1: '9071259d7852875d',
  2: 'ca6336eb22979741',
  3: 'a6e09fa1d3759569',
});
