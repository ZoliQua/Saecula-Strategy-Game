import { NAVAL } from '../../config/balance';
import type { TileCoord } from '../../iso/coordinates';
import type { MapData } from '../MapData';
import { TERRAIN } from '../TerrainTypes';
import { inBounds } from './startArea';

/** Fish schools placed per start (M14): within this ring of it, on open water. */
export const FISH_PER_START = { count: 4, ring: { min: 6, max: 24 } } as const;

/** Open water with open water all round it: a fish school there leaves room for boats on every side. */
function openSea(map: MapData, tx: number, ty: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!inBounds(map, tx + dx, ty + dy) || map.getTile(tx + dx, ty + dy) !== TERRAIN.water) return false;
    }
  }
  return true;
}

/**
 * Fish schools (M14): FISH_PER_START.count near every start (nearest open
 * water within its ring, spread round it), and `extra` more scattered on
 * open sea. Schools never touch each other.
 */
export function placeFish(map: MapData, rng: () => number, starts: readonly TileCoord[], extra: number): void {
  const { count, ring } = FISH_PER_START;
  for (const s of starts) {
    const spots: TileCoord[] = [];
    for (let dy = -ring.max; dy <= ring.max; dy++) {
      for (let dx = -ring.max; dx <= ring.max; dx++) {
        const d = Math.hypot(dx, dy);
        if (d < ring.min || d > ring.max) continue;
        if (openSea(map, s.tx + dx, s.ty + dy)) spots.push({ tx: s.tx + dx, ty: s.ty + dy });
      }
    }
    spots.sort((a, b) => Math.hypot(a.tx - s.tx, a.ty - s.ty) - Math.hypot(b.tx - s.tx, b.ty - s.ty) || rng() - 0.5);
    let placed = 0;
    for (const t of spots) {
      if (placed >= count) break;
      if (!openSea(map, t.tx, t.ty)) continue;
      map.setTile(t.tx, t.ty, TERRAIN.fish);
      placed++;
    }
  }
  for (let tries = 0, placed = 0; placed < extra && tries < extra * 50; tries++) {
    const tx = Math.floor(rng() * map.width);
    const ty = Math.floor(rng() * map.height);
    if (!openSea(map, tx, ty)) continue;
    map.setTile(tx, ty, TERRAIN.fish);
    placed++;
  }
}

/** Whether (tx, ty) lies nearer `start` than any other of `starts`. */
function nearestTo(starts: readonly TileCoord[], start: TileCoord, tx: number, ty: number): boolean {
  const own = Math.hypot(tx - start.tx, ty - start.ty);
  return starts.every((o) => o === start || Math.hypot(tx - o.tx, ty - o.ty) > own);
}

/** How far (tiles) from a start ensureDockSites looks for a shore site. */
const DOCK_SITE_RADIUS = 20;

/**
 * Every start gets a dock site (M14): the nearest 3×3 patch of its land
 * with open water along a side (NAVAL.dockMinShore tiles at least) is cleared to grass
 * (trees there are felled; gold and berries are never touched).
 */
export function ensureDockSites(map: MapData, starts: readonly TileCoord[]): void {
  const water = (tx: number, ty: number) => inBounds(map, tx, ty) && map.getTile(tx, ty) === TERRAIN.water;
  const land = (tx: number, ty: number) => {
    if (!inBounds(map, tx, ty)) return false;
    const t = map.getTile(tx, ty);
    return t === TERRAIN.grass || t === TERRAIN.forest;
  };
  for (const s of starts) {
    const sites: TileCoord[] = [];
    for (let dy = -DOCK_SITE_RADIUS; dy <= DOCK_SITE_RADIUS; dy++) {
      for (let dx = -DOCK_SITE_RADIUS; dx <= DOCK_SITE_RADIUS; dx++) {
        // Outside the town centre's core.
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 5) continue;
        // On its own side: never a neighbour's shore (crowded starts, separate islands).
        if (!nearestTo(starts, s, s.tx + dx + 1, s.ty + dy + 1)) continue;
        sites.push({ tx: s.tx + dx, ty: s.ty + dy });
      }
    }
    // The best site fells the fewest trees (the start's wood stays), then lies nearest.
    let best: TileCoord | null = null;
    let bestCost = Infinity;
    for (const o of sites) {
      let ok = true;
      let trees = 0;
      for (let y = 0; y < 3 && ok; y++) {
        for (let x = 0; x < 3 && ok; x++) {
          ok = land(o.tx + x, o.ty + y);
          if (ok && map.getTile(o.tx + x, o.ty + y) === TERRAIN.forest) trees++;
        }
      }
      if (!ok) continue;
      let shore = 0;
      for (let k = 0; k < 3; k++) {
        if (water(o.tx + k, o.ty - 1)) shore++;
        if (water(o.tx + k, o.ty + 3)) shore++;
        if (water(o.tx - 1, o.ty + k)) shore++;
        if (water(o.tx + 3, o.ty + k)) shore++;
      }
      if (shore < NAVAL.dockMinShore) continue;
      const cost = trees * 10 + Math.hypot(o.tx - s.tx, o.ty - s.ty);
      if (cost < bestCost) {
        bestCost = cost;
        best = o;
      }
    }
    if (!best) continue;
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) map.setTile(best.tx + x, best.ty + y, TERRAIN.grass);
  }
}
