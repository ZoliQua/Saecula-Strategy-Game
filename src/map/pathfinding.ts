import PF from 'pathfinding';
import type { TileCoord } from '../iso/coordinates';
import { escapeSteps, STRICT_ESCAPE, type EscapeRules } from './escape';
import { canStep, NEIGHBOUR_STEPS, unwind } from './gridSteps';
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
 * exit-less pocket first walks the escape steps off it, crossing only what
 * `escape` allows (see `escapeSteps`; by default nothing but the start tile);
 * when the goal is unreachable from there, the escape steps alone are
 * returned so the unit still gets out.
 */
export function findPath(
  map: MapData,
  start: TileCoord,
  goal: TileCoord,
  escape: EscapeRules = STRICT_ESCAPE,
): TileCoord[] | null {
  if (start.tx === goal.tx && start.ty === goal.ty) return [start];
  return withEscape(map, start, goal, escape, (from) => findPlainPath(map, from, goal));
}

/** Runs `plan` from `start`, or from the end of the escape steps (prepended) when `start` needs one. */
function withEscape(
  map: MapData,
  start: TileCoord,
  toward: TileCoord | undefined,
  rules: EscapeRules,
  plan: (from: TileCoord) => TileCoord[] | null,
): TileCoord[] | null {
  const steps = escapeSteps(map, start, rules, toward);
  if (!steps) return plan(start);
  const rest = plan(steps.at(-1)!);
  return rest && rest.length > 1 ? [...steps, ...rest.slice(1)] : steps;
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
  escape: EscapeRules = STRICT_ESCAPE,
): TileCoord[] | null {
  return withEscape(map, start, goal, escape, (from) => {
    if (map.isPassable(goal.tx, goal.ty)) {
      const direct = findPlainPath(map, from, goal);
      if (direct) return direct;
    }
    const nearest = nearestReachableTile(map, from, goal);
    if (!nearest || (nearest.tx === from.tx && nearest.ty === from.ty)) return null;
    return findPlainPath(map, from, nearest);
  });
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
  escape: EscapeRules = STRICT_ESCAPE,
): TileCoord[] | null {
  const steps = escapeSteps(map, start, escape);
  const from = steps ? steps.at(-1)! : start;
  if (steps && isGoal(from.tx, from.ty)) return steps;
  const w = map.width;
  const parent = new Int32Array(w * map.height).fill(-1);
  const origin = from.ty * w + from.tx;
  parent[origin] = origin;
  const queue: number[] = [origin];
  for (let head = 0; head < queue.length; head++) {
    const idx = queue[head]!;
    const tx = idx % w;
    const ty = (idx - tx) / w;
    if (isGoal(tx, ty) && idx !== origin) {
      const rest = unwind(parent, idx, w);
      return steps ? [...steps, ...rest.slice(1)] : rest;
    }
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

function distSq(a: TileCoord, b: TileCoord): number {
  return (a.tx - b.tx) ** 2 + (a.ty - b.ty) ** 2;
}
