import type { KingTuning } from '../../config/aiModes';
import type { FootprintSize } from '../../ecs/footprint';
import { distanceToFootprint } from '../../game/landmarks';
import { chebyshev, type TileCoord } from '../../iso/coordinates';
import { canStep, NEIGHBOUR_STEPS } from '../../map/gridSteps';
import type { NavGrid } from '../../map/navGrid';

/** Something seen that can hurt the king. */
export interface KingThreat {
  readonly position: TileCoord;
  readonly range: number;
}

/** The town centre the king keeps to. */
export interface KingHome {
  readonly position: TileCoord;
  readonly footprint: FootprintSize;
}

/** How far `at` is beyond the reach of the worst threat, at most `cap`. */
export function clearance(at: TileCoord, threats: readonly KingThreat[], cap: number): number {
  let least = cap;
  for (const t of threats) least = Math.min(least, chebyshev(at, t.position) - t.range);
  return least;
}

/**
 * Where a threatened king steps, or null to stand (or to walk on to `heading`): of the tiles near
 * home it can walk to without passing next to a threat, and within `rallyRadius` of the town centre
 * or of one of its defenders (`rally`), the clearest with a way out (then the fewest steps). Only for
 * a tile `margin` clearer than where it is or heads, so it cannot jitter. The search stays in the
 * home's few hundred tiles and runs only under alarm. No RNG.
 */
export function kingRefuge(
  map: NavGrid,
  from: TileCoord,
  heading: TileCoord | null,
  home: KingHome,
  threats: readonly KingThreat[],
  tune: KingTuning,
  rally: readonly TileCoord[] = [],
): TileCoord | null {
  if (clearance(from, threats, tune.safe) > tune.alarm) return null;
  const current = clearance(heading ?? from, threats, tune.safe);
  const out = (at: TileCoord) => distanceToFootprint(at, home.position, home.footprint);
  const area = Math.max(tune.homeRadius, out(from));
  const key = (at: TileCoord) => at.ty * map.width + at.tx;
  const seen = new Set([key(from)]);
  const queue = [from];
  let best: TileCoord | null = null;
  let bestClear = current + tune.margin - 1;
  for (let head = 0; head < queue.length; head++) {
    const at = queue[head]!;
    let exits = 0;
    for (const [dx, dy] of NEIGHBOUR_STEPS) {
      if (!canStep(map, at.tx, at.ty, dx, dy)) continue;
      exits++;
      const next = { tx: at.tx + dx, ty: at.ty + dy };
      if (seen.has(key(next)) || out(next) > area || threats.some((t) => chebyshev(next, t.position) <= 1)) continue;
      seen.add(key(next));
      queue.push(next);
    }
    if (exits < tune.minExits || out(at) > tune.homeRadius) continue;
    if (out(at) > tune.rallyRadius && !rally.some((r) => chebyshev(r, at) <= tune.rallyRadius)) continue;
    const clear = clearance(at, threats, tune.safe);
    if (clear > bestClear) {
      best = at;
      bestClear = clear;
    }
  }
  return best;
}
