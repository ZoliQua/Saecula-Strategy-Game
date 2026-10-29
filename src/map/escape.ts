import type { TileCoord } from '../iso/coordinates';
import { hasExit, NEIGHBOUR_STEPS, reachMask, unwind } from './gridSteps';
import type { MapData } from './MapData';

/**
 * What an escape off blocked ground may pass. Only the structure the unit
 * stands on (a foundation laid over it) may be crossed, never a neighbouring
 * building or a wall segment.
 */
export interface EscapeRules {
  /** A blocked tile the escape may cross (the start tile always may). */
  crossable(tx: number, ty: number): boolean;
  /** A blocked corner that a step out of an exit-less pocket may cut (never a wall segment). */
  cuttable(tx: number, ty: number): boolean;
}

/** No crossing at all: a unit can only leave its own blocked tile onto a free neighbour. */
export const STRICT_ESCAPE: EscapeRules = { crossable: () => false, cuttable: () => false };

/**
 * The way off blocked ground: null when `start` is passable and has a legal
 * step out (the normal case, no escape needed).
 *
 * - A start on blocked ground walks, across `rules.crossable` tiles only, to
 *   a passable tile next to that structure (the ring of a footprint).
 * - A passable start whose only free neighbours are diagonal steps past
 *   blocked corners takes one such step, if both corners are free or
 *   `rules.cuttable`.
 *
 * Among the possible exits the nearest one from which `toward` can be
 * reached wins; otherwise the nearest one that has a step onward, then the
 * nearest at all. Null when there is no exit (the plain search then fails).
 * Returns the steps from `start` (included) to the exit.
 */
export function escapeSteps(
  map: MapData,
  start: TileCoord,
  rules: EscapeRules = STRICT_ESCAPE,
  toward?: TileCoord,
): TileCoord[] | null {
  const w = map.width;
  const h = map.height;
  if (start.tx < 0 || start.ty < 0 || start.tx >= w || start.ty >= h) return null;
  const startFree = map.isPassable(start.tx, start.ty);
  if (startFree && hasExit(map, start.tx, start.ty)) return null;
  const parent = new Int32Array(w * h).fill(-1);
  const origin = start.ty * w + start.tx;
  parent[origin] = origin;
  const queue: number[] = [origin];
  const exits: number[] = [];
  const free = (tx: number, ty: number) => map.isPassable(tx, ty) || rules.crossable(tx, ty);
  for (let head = 0; head < queue.length; head++) {
    const idx = queue[head]!;
    const tx = idx % w;
    const ty = (idx - tx) / w;
    for (const [dx, dy] of NEIGHBOUR_STEPS) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const n = ny * w + nx;
      if (parent[n] !== -1) continue;
      if (map.isPassable(nx, ny)) {
        // An exit: a diagonal step out never squeezes between two foreign blocked tiles.
        const corner = (cx: number, cy: number) => free(cx, cy) || (startFree && rules.cuttable(cx, cy));
        if (dx !== 0 && dy !== 0 && (!corner(tx + dx, ty) || !corner(tx, ty + dy))) continue;
        parent[n] = idx;
        exits.push(n);
      } else if (!startFree && rules.crossable(nx, ny)) {
        parent[n] = idx;
        queue.push(n);
      }
    }
  }
  const chosen = pickExit(map, exits, toward);
  return chosen === undefined ? null : unwind(parent, chosen, w);
}

function pickExit(map: MapData, exits: readonly number[], toward: TileCoord | undefined): number | undefined {
  const w = map.width;
  const at = (i: number) => ({ tx: i % w, ty: Math.floor(i / w) });
  if (toward && exits.length > 1) {
    const reach = reachMask(map, toward);
    const reaching = exits.find((i) => reach[i] === 1);
    if (reaching !== undefined) return reaching;
  }
  return exits.find((i) => hasExit(map, at(i).tx, at(i).ty)) ?? exits[0];
}
