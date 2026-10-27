import { beforeAll, describe, expect, it } from 'vitest';
import { WALL_E, WALL_N, WALL_NE, WALL_NW, WALL_S, WALL_SE, WALL_SW, WALL_W } from '../../../game/wallNeighbours';
import type { AgeId, CivId } from '../../../types';
import { installRecordingCanvas } from '../testing/recordingCanvas';

/*
 * Join continuity (M4 Task 5 fix round 1): next to a post, every arm of
 * every wall style must reach the post's body (its narrowest upright
 * half-width above the plinth), or ground shows between run and post —
 * on 45° runs most of all.
 */

const ARMS = [WALL_N, WALL_E, WALL_S, WALL_W, WALL_NE, WALL_SE, WALL_SW, WALL_NW] as const;
/** Far end of each arm bit (paintWall ARM_ENDS). */
const END: Record<number, readonly [number, number]> = {
  [WALL_N]: [0.5, 0], [WALL_E]: [1, 0.5], [WALL_S]: [0.5, 1], [WALL_W]: [0, 0.5],
  [WALL_NE]: [1, 0], [WALL_SE]: [1, 1], [WALL_SW]: [0, 1], [WALL_NW]: [0, 0],
};

describe('wall arms reach their posts', () => {
  let paintWall: typeof import('./paintWall');
  let styles: typeof import('./wallStyles');
  beforeAll(async () => {
    installRecordingCanvas();
    paintWall = await import('./paintWall');
    styles = await import('./wallStyles');
  });

  it('every style, age and arm: the arm starts no farther out than the post body', () => {
    for (const civ of ['hungarian', 'english'] as CivId[]) {
      for (const age of [1, 2, 3] as AgeId[]) {
        const style = styles.wallStyleFor(age, civ);
        const body = style.postBody ?? style.postHalf;
        for (const bit of ARMS) {
          const diagonal = bit > WALL_W;
          const end = END[bit]!;
          const start = paintWall.armStartOf(style, diagonal, end[0] + end[1] <= 1);
          expect(start, `${civ} age ${age} arm ${bit}`).toBeLessThanOrEqual(body * (diagonal ? Math.SQRT2 : 1) + 1e-9);
        }
      }
    }
  });
});
