import type { TileCoord } from '../iso/coordinates';
import { NEIGHBOUR_STEPS } from './gridSteps';
import type { MapData } from './MapData';
import { TERRAIN } from './TerrainTypes';

/**
 * Connected bodies of open water (M14): each open water tile (water that
 * nothing blocks, i.e. waterGrid's passable tiles) carries the label of the
 * body it belongs to, 0 elsewhere. Bodies join by the path searches' legal
 * steps (canStep: no cutting a blocked corner), so a body is exactly what
 * reachMask(waterGrid(map), tile) floods from any of its tiles.
 *
 * Computed once per map and rebuilt only when open water changes
 * (MapData.waterRevision: a fish school fished out, a tile blocked or freed).
 * Not saved: rebuilt from the map after a load.
 */
interface Labelled {
  readonly revision: number;
  readonly labels: Int32Array;
}

const cache = new WeakMap<MapData, Labelled>();

/** The water-body label of every tile of `map` (0: not open water), cached per map. */
export function waterBodies(map: MapData): Int32Array {
  const hit = cache.get(map);
  if (hit && hit.revision === map.waterRevision) return hit.labels;
  const labels = label(map);
  cache.set(map, { revision: map.waterRevision, labels });
  return labels;
}

function label(map: MapData): Int32Array {
  const w = map.width;
  const h = map.height;
  const tiles = map.getRawTiles();
  const blocked = map.getRawBlocked();
  const open = (tx: number, ty: number) => {
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) return false;
    const i = ty * w + tx;
    return tiles[i] === TERRAIN.water && blocked[i] === 0;
  };
  const labels = new Int32Array(w * h);
  const queue = new Int32Array(w * h);
  let next = 0;
  for (let start = 0; start < w * h; start++) {
    if (labels[start] !== 0 || tiles[start] !== TERRAIN.water || blocked[start] !== 0) continue;
    const id = ++next;
    labels[start] = id;
    let tail = 0;
    queue[tail++] = start;
    for (let head = 0; head < tail; head++) {
      const idx = queue[head]!;
      const tx = idx % w;
      const ty = (idx - tx) / w;
      for (const [dx, dy] of NEIGHBOUR_STEPS) {
        const nx = tx + dx;
        const ny = ty + dy;
        if (!open(nx, ny)) continue;
        // A diagonal step never cuts a blocked corner (canStep).
        if (dx !== 0 && dy !== 0 && !(open(nx, ty) && open(tx, ny))) continue;
        const n = ny * w + nx;
        if (labels[n] !== 0) continue;
        labels[n] = id;
        queue[tail++] = n;
      }
    }
  }
  return labels;
}

/** The open water a ship at a tile can sail to (its own sea), as a membership test. */
export interface Sea {
  /** Whether (tx, ty) is open water of this sea (false outside the map). */
  has(tx: number, ty: number): boolean;
}

/**
 * The sea a ship at `from` can sail to: the body of `from`, or, when `from`
 * is not open water, the bodies beside it (the same tiles reachMask on the
 * water layer would flood). No flood: a label lookup on waterBodies.
 */
export function seaAt(map: MapData, from: TileCoord): Sea {
  const labels = waterBodies(map);
  const w = map.width;
  const h = map.height;
  const at = (tx: number, ty: number) => (tx < 0 || ty < 0 || tx >= w || ty >= h ? 0 : labels[ty * w + tx]!);
  const own = at(from.tx, from.ty);
  const ids: number[] = [];
  if (own !== 0) ids.push(own);
  else {
    for (const [dx, dy] of NEIGHBOUR_STEPS) {
      const id = at(from.tx + dx, from.ty + dy);
      if (id !== 0 && !ids.includes(id)) ids.push(id);
    }
  }
  if (ids.length === 1) {
    const only = ids[0]!;
    return { has: (tx, ty) => at(tx, ty) === only };
  }
  return { has: (tx, ty) => { const id = at(tx, ty); return id !== 0 && ids.includes(id); } };
}
