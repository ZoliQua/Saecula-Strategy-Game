import PF from 'pathfinding';
import type { TileCoord } from '../iso/coordinates';
import type { MapData } from './MapData';

/**
 * A* wrapper over the `pathfinding` library. Converts MapData into a
 * PF.Grid (walkable = isPassable) once per call; for M1 this is
 * acceptable, but in M2+ we'll cache the grid and invalidate on
 * terrain/building changes.
 *
 * Returns the full path including both endpoints, or `null` if no
 * path exists. Start and goal are always considered walkable to let
 * units step onto e.g. a resource drop-off; the caller is responsible
 * for interpreting "standing on a workable tile" vs actually entering
 * it.
 */
export function findPath(
  map: MapData,
  start: TileCoord,
  goal: TileCoord,
): TileCoord[] | null {
  if (start.tx === goal.tx && start.ty === goal.ty) return [start];

  const grid = buildGrid(map);
  grid.setWalkableAt(start.tx, start.ty, true);
  grid.setWalkableAt(goal.tx, goal.ty, true);

  const finder = new PF.AStarFinder({
    diagonalMovement: PF.DiagonalMovement.OnlyWhenNoObstacles,
  });
  const raw = finder.findPath(start.tx, start.ty, goal.tx, goal.ty, grid);
  if (raw.length === 0) return null;
  return raw.map(([tx, ty]) => ({ tx: tx as number, ty: ty as number }));
}

function buildGrid(map: MapData): PF.Grid {
  const grid = new PF.Grid(map.width, map.height);
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      grid.setWalkableAt(tx, ty, map.isPassable(tx, ty));
    }
  }
  return grid;
}

const NEIGHBOUR_STEPS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/**
 * Like `findPath`, but never fails just because the goal is walled off or
 * blocked: it walks to the reachable tile nearest to `goal` instead. Returns
 * null only when no reachable tile is closer to the goal than `start` itself
 * (the unit is already as close as it can get), so callers can stop instead
 * of re-planning forever.
 */
export function findPathToNearest(
  map: MapData,
  start: TileCoord,
  goal: TileCoord,
): TileCoord[] | null {
  if (map.isPassable(goal.tx, goal.ty)) {
    const direct = findPath(map, start, goal);
    if (direct) return direct;
  }
  const nearest = nearestReachableTile(map, start, goal);
  if (!nearest || (nearest.tx === start.tx && nearest.ty === start.ty)) return null;
  return findPath(map, start, nearest);
}

/**
 * Breadth-first flood over passable tiles from `start` (same diagonal rule
 * as the A* finder: no cutting corners); returns the reached tile with the
 * least squared distance to `goal`, ties broken by fewer steps.
 */
export function nearestReachableTile(
  map: MapData,
  start: TileCoord,
  goal: TileCoord,
): TileCoord | null {
  const w = map.width;
  const seen = new Uint8Array(w * map.height);
  const queue: number[] = [start.ty * w + start.tx];
  seen[queue[0]!] = 1;
  let best: TileCoord = start;
  let bestD = distSq(start, goal);
  for (let head = 0; head < queue.length; head++) {
    const idx = queue[head]!;
    const tx = idx % w;
    const ty = (idx - tx) / w;
    for (const [dx, dy] of NEIGHBOUR_STEPS) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (!map.isPassable(nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (!map.isPassable(tx + dx, ty) || !map.isPassable(tx, ty + dy))) {
        continue;
      }
      const n = ny * w + nx;
      if (seen[n]) continue;
      seen[n] = 1;
      queue.push(n);
      const d = distSq({ tx: nx, ty: ny }, goal);
      if (d < bestD) {
        bestD = d;
        best = { tx: nx, ty: ny };
      }
    }
  }
  return best;
}

function distSq(a: TileCoord, b: TileCoord): number {
  return (a.tx - b.tx) ** 2 + (a.ty - b.ty) ** 2;
}
