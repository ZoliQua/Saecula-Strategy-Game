import type { TileCoord } from '../../iso/coordinates';
import type { MapData } from '../MapData';
import type { TerrainId } from '../TerrainTypes';

const STEPS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/**
 * Tiles reachable on foot from any of `from` (8 directions, no corner
 * cutting — the A* rule), as a 0/1 grid indexed `ty * w + tx`.
 */
export function floodFrom(
  from: readonly TileCoord[],
  w: number,
  h: number,
  walkable: (tx: number, ty: number) => boolean,
): Uint8Array {
  const seen = new Uint8Array(w * h);
  const queue: number[] = [];
  for (const f of from) {
    if (!walkable(f.tx, f.ty) || seen[f.ty * w + f.tx]) continue;
    seen[f.ty * w + f.tx] = 1;
    queue.push(f.ty * w + f.tx);
  }
  for (let head = 0; head < queue.length; head++) {
    const idx = queue[head]!;
    const tx = idx % w;
    const ty = (idx - tx) / w;
    for (const [dx, dy] of STEPS) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[ny * w + nx]) continue;
      if (!walkable(nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (!walkable(tx + dx, ty) || !walkable(tx, ty + dy))) continue;
      seen[ny * w + nx] = 1;
      queue.push(ny * w + nx);
    }
  }
  return seen;
}

/** Passable tiles walkable from `from` on the bare terrain. */
export function reachableFrom(map: MapData, from: readonly TileCoord[]): Uint8Array {
  return floodFrom(from, map.width, map.height, (tx, ty) => map.isPassable(tx, ty));
}

/**
 * Passable pockets no start can walk to (a glade sealed by trees, a
 * meadow walled in by cliffs) are filled with `terrain`, so nothing —
 * no building site, no berry bush — ends up where villagers can't go.
 */
export function fillPockets(map: MapData, from: readonly TileCoord[], terrain: TerrainId): void {
  const reached = reachableFrom(map, from);
  const w = map.width;
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < w; tx++) {
      if (!reached[ty * w + tx] && map.isPassable(tx, ty)) map.setTile(tx, ty, terrain);
    }
  }
}

/** Fraction of the map's tiles that are `terrain`. */
export function terrainShare(map: MapData, terrain: TerrainId): number {
  let n = 0;
  for (const t of map.getRawTiles()) if (t === terrain) n++;
  return n / (map.width * map.height);
}
