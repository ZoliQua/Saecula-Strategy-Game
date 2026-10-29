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
 *
 * A start on blocked ground (a foundation placed over the unit) or in an
 * exit-less pocket first walks the escape steps to the nearest tile a path
 * can leave from (see `escapeSteps`); when the goal is unreachable from
 * there, the escape steps alone are returned so the unit still gets out.
 */
export function findPath(
  map: MapData,
  start: TileCoord,
  goal: TileCoord,
): TileCoord[] | null {
  if (start.tx === goal.tx && start.ty === goal.ty) return [start];
  const escape = escapeSteps(map, start);
  if (escape) return joinEscape(escape, findPlainPath(map, escape.at(-1)!, goal));
  return findPlainPath(map, start, goal);
}

/** A* from a start that can leave (the library's search, start and goal forced walkable). */
function findPlainPath(map: MapData, start: TileCoord, goal: TileCoord): TileCoord[] | null {
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
  const escape = escapeSteps(map, start);
  if (escape) return joinEscape(escape, findPathToNearest(map, escape.at(-1)!, goal));
  if (map.isPassable(goal.tx, goal.ty)) {
    const direct = findPlainPath(map, start, goal);
    if (direct) return direct;
  }
  const nearest = nearestReachableTile(map, start, goal);
  if (!nearest || (nearest.tx === start.tx && nearest.ty === start.ty)) return null;
  return findPlainPath(map, start, nearest);
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
      if (!canStep(map, tx, ty, dx, dy)) continue;
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

/**
 * Breadth-first walk over passable tiles from `start` (the A* finder's
 * diagonal rule) to the nearest tile where `isGoal` holds; the path from
 * `start` to it (both included), or null when no reachable tile qualifies.
 * The fallback when the work tile a system picked turns out to be cut off
 * (e.g. a grass hole inside a forest) while another one is reachable.
 */
export function findPathToAny(
  map: MapData,
  start: TileCoord,
  isGoal: (tx: number, ty: number) => boolean,
): TileCoord[] | null {
  const escape = escapeSteps(map, start);
  const from = escape ? escape.at(-1)! : start;
  if (escape && isGoal(from.tx, from.ty)) return escape;
  const w = map.width;
  const parent = new Int32Array(w * map.height).fill(-1);
  const origin = from.ty * w + from.tx;
  parent[origin] = origin;
  const queue: number[] = [origin];
  for (let head = 0; head < queue.length; head++) {
    const idx = queue[head]!;
    const tx = idx % w;
    const ty = (idx - tx) / w;
    if (isGoal(tx, ty) && idx !== origin) return joinEscape(escape ?? [from], unwind(parent, idx, w));
    for (const [dx, dy] of NEIGHBOUR_STEPS) {
      if (!canStep(map, tx, ty, dx, dy)) continue;
      const n = (ty + dy) * w + tx + dx;
      if (parent[n] !== -1) continue;
      parent[n] = idx;
      queue.push(n);
    }
  }
  return null;
}

/**
 * The way off blocked ground: null when `start` is passable and has a legal
 * step out (the normal case, no escape needed). A start on blocked ground
 * gets the shortest walk from `start` (included), across blocked tiles, to
 * the nearest passable tile that has a step out. A passable start whose only
 * free neighbours are diagonal corner cuts gets that one diagonal step; a
 * passable tile with no free neighbour at all stays walled in (null). If the
 * whole map offers no way out, null as well (the plain search then fails).
 */
export function escapeSteps(map: MapData, start: TileCoord): TileCoord[] | null {
  if (map.isPassable(start.tx, start.ty)) {
    if (hasExit(map, start.tx, start.ty)) return null;
    for (const [dx, dy] of NEIGHBOUR_STEPS) {
      const next = { tx: start.tx + dx, ty: start.ty + dy };
      if (map.isPassable(next.tx, next.ty)) return [start, next];
    }
    return null;
  }
  const w = map.width;
  const h = map.height;
  if (start.tx < 0 || start.ty < 0 || start.tx >= w || start.ty >= h) return null;
  const parent = new Int32Array(w * h).fill(-1);
  const origin = start.ty * w + start.tx;
  parent[origin] = origin;
  const queue: number[] = [origin];
  for (let head = 0; head < queue.length; head++) {
    const idx = queue[head]!;
    const tx = idx % w;
    const ty = (idx - tx) / w;
    if (idx !== origin && map.isPassable(tx, ty) && hasExit(map, tx, ty)) return unwind(parent, idx, w);
    for (const [dx, dy] of NEIGHBOUR_STEPS) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const n = ny * w + nx;
      if (parent[n] !== -1) continue;
      parent[n] = idx;
      queue.push(n);
    }
  }
  return null;
}

/** Escape steps followed by the path from their last tile (its first tile is that same tile). */
function joinEscape(escape: TileCoord[], rest: TileCoord[] | null): TileCoord[] {
  return rest && rest.length > 1 ? [...escape, ...rest.slice(1)] : escape;
}

/** The tiles from the search origin to `idx` (both included), read back through `parent`. */
function unwind(parent: Int32Array, idx: number, w: number): TileCoord[] {
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

/** One step (dx, dy) from (tx, ty) onto passable ground, never cutting a blocked corner. */
function canStep(map: MapData, tx: number, ty: number, dx: number, dy: number): boolean {
  if (!map.isPassable(tx + dx, ty + dy)) return false;
  return dx === 0 || dy === 0 || (map.isPassable(tx + dx, ty) && map.isPassable(tx, ty + dy));
}

function hasExit(map: MapData, tx: number, ty: number): boolean {
  for (const [dx, dy] of NEIGHBOUR_STEPS) if (canStep(map, tx, ty, dx, dy)) return true;
  return false;
}

function distSq(a: TileCoord, b: TileCoord): number {
  return (a.tx - b.tx) ** 2 + (a.ty - b.ty) ** 2;
}
