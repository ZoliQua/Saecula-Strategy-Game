import type { TileCoord } from '../iso/coordinates';
import type { MapData } from './MapData';

/* Grid-walk primitives shared by the path searches (pathfinding, escape). */

/** The 8 neighbour steps, orthogonal first. */
export const NEIGHBOUR_STEPS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/** One step (dx, dy) from (tx, ty) onto passable ground, never cutting a blocked corner (the A* finder's rule). */
export function canStep(map: MapData, tx: number, ty: number, dx: number, dy: number): boolean {
  if (!map.isPassable(tx + dx, ty + dy)) return false;
  return dx === 0 || dy === 0 || (map.isPassable(tx + dx, ty) && map.isPassable(tx, ty + dy));
}

/** Whether a unit on (tx, ty) has at least one legal step. */
export function hasExit(map: MapData, tx: number, ty: number): boolean {
  for (const [dx, dy] of NEIGHBOUR_STEPS) if (canStep(map, tx, ty, dx, dy)) return true;
  return false;
}

/** The tiles from the search origin to `idx` (both included), read back through `parent`. */
export function unwind(parent: Int32Array, idx: number, w: number): TileCoord[] {
  const out: TileCoord[] = [];
  let i = idx;
  for (;;) {
    const tx = i % w;
    out.push({ tx, ty: (i - tx) / w });
    const p = parent[i]!;
    if (p === i) break;
    i = p;
  }
  return out.reverse();
}

/**
 * The passable tiles a walk can reach `goal` from (legal steps only), as a
 * map-sized mask. A blocked goal (a site, a tree) counts as reached from its
 * free neighbours.
 */
export function reachMask(map: MapData, goal: TileCoord): Uint8Array {
  const w = map.width;
  const mask = new Uint8Array(w * map.height);
  const queue: number[] = [];
  const seed = (tx: number, ty: number) => {
    if (!map.isPassable(tx, ty)) return;
    const i = ty * w + tx;
    if (mask[i]) return;
    mask[i] = 1;
    queue.push(i);
  };
  seed(goal.tx, goal.ty);
  if (!map.isPassable(goal.tx, goal.ty)) for (const [dx, dy] of NEIGHBOUR_STEPS) seed(goal.tx + dx, goal.ty + dy);
  for (let head = 0; head < queue.length; head++) {
    const idx = queue[head]!;
    const tx = idx % w;
    const ty = (idx - tx) / w;
    for (const [dx, dy] of NEIGHBOUR_STEPS) if (canStep(map, tx, ty, dx, dy)) seed(tx + dx, ty + dy);
  }
  return mask;
}
