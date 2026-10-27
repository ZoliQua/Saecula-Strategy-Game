import { START_ECONOMY } from '../../config/balance';
import type { TileCoord } from '../../iso/coordinates';
import type { MapData } from '../MapData';
import { randInt } from '../random';
import { villagerSpawnTiles } from '../startLayout';
import { TERRAIN, isPassable } from '../TerrainTypes';
import { floodFrom } from './regions';
import { inBounds, lodeTiles, nearAnyStart, ringPoint, START_CORE_RADIUS, type TilePredicate } from './startArea';

/** Placement tries per start and pass: the first half fan out from the side facing the map centre, the rest go anywhere. */
const ATTEMPTS = 96;

/**
 * Every start's second gold lode (START_ECONOMY.outerGold), for the later
 * ages: a lode a short walk out, nearer its own start than any other, on
 * ground the start's villagers reach. Forest in the one-tile apron around
 * it is cleared to grass, so the lode never plugs a road and can be worked
 * from every side. `blocked` tiles (preset walls) are kept out and walked
 * around. Run it after the start economies; validation rejects a map
 * where a lode found no room.
 */
export function placeOuterGoldLodes(
  map: MapData,
  rng: () => number,
  starts: readonly TileCoord[],
  blocked: TilePredicate = () => false,
): void {
  const center = { tx: (map.width - 1) / 2, ty: (map.height - 1) / 2 };
  const g = START_ECONOMY.outerGold;
  // First beyond every start's economy radius (apron too), on grass or forest. On a crowded map, then
  // closer in but on open grass only, so the lode still never eats a start's trees.
  const passes: readonly Pass[] = [
    { ring: g.ring, keepOut: nearAnyStart(starts, START_ECONOMY.radius + 1), forest: true },
    { ring: g.crowdedRing, keepOut: nearAnyStart(starts, START_CORE_RADIUS + 1), forest: false },
  ];
  starts.forEach((start, i) => {
    const others = starts.filter((_, j) => j !== i);
    const reached = floodFrom([villagerSpawnTiles(start)[1]!], map.width, map.height, (tx, ty) =>
      inBounds(map, tx, ty) && isPassable(map.getTile(tx, ty)) && !blocked(tx, ty),
    );
    const count = randInt(rng, g.tiles.min, g.tiles.max + 1);
    const toCenter = Math.atan2(center.ty - start.ty, center.tx - start.tx);
    for (const pass of passes) {
      const site = { map, start, others, reached, blocked, pass };
      for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
        const spread = Math.PI * Math.min(1, (2 * attempt) / ATTEMPTS);
        const dist = pass.ring.min + rng() * (pass.ring.max - pass.ring.min);
        const lode = lodeTiles(ringPoint(start, toCenter + (rng() * 2 - 1) * spread, dist), rng() < 0.5, count);
        if (!lodeFits(site, lode)) continue;
        for (const t of apron(lode)) if (map.getTile(t.tx, t.ty) === TERRAIN.forest) map.setTile(t.tx, t.ty, TERRAIN.grass);
        for (const t of lode) map.setTile(t.tx, t.ty, TERRAIN.gold_mine);
        return;
      }
    }
  });
}

interface Pass {
  readonly ring: { readonly min: number; readonly max: number };
  /** Lode tiles stay off these (start areas). */
  readonly keepOut: TilePredicate;
  /** The lode and its apron may take forest (cleared); else open grass only. */
  readonly forest: boolean;
}

interface Site {
  readonly map: MapData;
  readonly start: TileCoord;
  readonly others: readonly TileCoord[];
  readonly reached: Uint8Array;
  readonly blocked: TilePredicate;
  readonly pass: Pass;
}

/**
 * The lode lands on the pass's ground (grass, or forest too), off the
 * pass's start areas and every blocked tile, `ownMargin` nearer its start
 * than any other; its apron is the same ground (no cliff, water or other
 * resource), unblocked, and touches ground the start reaches.
 */
function lodeFits(site: Site, lode: readonly TileCoord[]): boolean {
  const { map, start, others, reached, blocked, pass } = site;
  const margin = START_ECONOMY.outerGold.ownMargin;
  const soft = (t: TileCoord) => {
    const terrain = map.getTile(t.tx, t.ty);
    return terrain === TERRAIN.grass || (pass.forest && terrain === TERRAIN.forest);
  };
  for (const t of lode) {
    if (!inBounds(map, t.tx, t.ty) || pass.keepOut(t.tx, t.ty) || blocked(t.tx, t.ty) || !soft(t)) return false;
    const own = Math.hypot(t.tx - start.tx, t.ty - start.ty);
    if (others.some((o) => Math.hypot(t.tx - o.tx, t.ty - o.ty) < own + margin)) return false;
  }
  let touches = false;
  for (const t of apron(lode)) {
    if (!inBounds(map, t.tx, t.ty) || blocked(t.tx, t.ty) || !soft(t)) return false;
    if (reached[t.ty * map.width + t.tx] === 1) touches = true;
  }
  return touches;
}

/** The ring of tiles around the lode's bounding box. */
function apron(lode: readonly TileCoord[]): TileCoord[] {
  const xs = lode.map((t) => t.tx);
  const ys = lode.map((t) => t.ty);
  const x0 = Math.min(...xs) - 1;
  const x1 = Math.max(...xs) + 1;
  const y0 = Math.min(...ys) - 1;
  const y1 = Math.max(...ys) + 1;
  const out: TileCoord[] = [];
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) if (tx === x0 || tx === x1 || ty === y0 || ty === y1) out.push({ tx, ty });
  }
  return out;
}
