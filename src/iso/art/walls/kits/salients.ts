import { WALL_NE, WALL_SE, WALL_SW } from '../../../../game/wallNeighbours';
import type { UV } from '../prism';

/*
 * Salients of a square bastion or pier: the three corners the viewer
 * sees (front, right, left). A diagonal arm runs out through one of
 * them, so a sentry box hung there would stand on the arm's crest;
 * styles pick the free ones (French échauguettes, Spanish garitas).
 */

export type Salient = 'front' | 'right' | 'left';

/** The diagonal arm that runs through each salient. */
export const SALIENT_ARM: Readonly<Record<Salient, number>> = { front: WALL_SE, right: WALL_NE, left: WALL_SW };

/** The salients in `prefer` (kept in that order) that no arm in `arms` runs through. */
export function freeSalients(arms: number, prefer: readonly Salient[]): Salient[] {
  return prefer.filter((s) => (arms & SALIENT_ARM[s]) === 0);
}

/** Ground point of a salient on a footprint from `lo` to `hi` (tiles) on both axes. */
export function salientAt(s: Salient, lo: number, hi: number): UV {
  return s === 'front' ? [hi, hi] : s === 'right' ? [hi, lo] : [lo, hi];
}
