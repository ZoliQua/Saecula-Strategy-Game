import { pinWalls } from '../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the Hungarian wall pieces (M4 Task 5): every
 * common piece plus junctions, crosses and diagonal joins of every age (see
 * testing/pinnedArt.testkit.ts), compared to the hashes recorded at
 * 8c43c49, before the English wall styles were added.
 */

pinWalls('hungarian', { 1: 'dc88c004228f2e34', 2: '064e94d92b933f6a', 3: 'b4912dc7bffee00f' });
