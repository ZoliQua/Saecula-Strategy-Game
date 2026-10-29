import type { EcsWorld } from '../../ecs/world';
import type { TileCoord } from '../../iso/coordinates';

/** A town centre the Haza button can jump to: its id and its footprint's middle tile. */
export interface HomeTarget {
  readonly id: number;
  readonly tile: TileCoord;
}

/** `playerId`'s living, finished town centres in id order. */
export function homeTargets(world: EcsWorld, playerId: number): HomeTarget[] {
  const out: HomeTarget[] = [];
  for (const b of world.with('building', 'position', 'owner')) {
    if (b.building.type !== 'town_center' || b.owner.playerId !== playerId || b.underConstruction || b.dying || b.id === undefined) continue;
    const fp = b.building.footprint;
    out.push({ id: b.id, tile: { tx: b.position.tx + (fp.width - 1) / 2, ty: b.position.ty + (fp.height - 1) / 2 } });
  }
  return out.sort((a, b) => a.id - b.id);
}

/** The town centre after `lastId` in id order, wrapping to the first (null: the player has none). */
export function nextHome(world: EcsWorld, playerId: number, lastId: number | null): HomeTarget | null {
  const all = homeTargets(world, playerId);
  return all.find((t) => lastId !== null && t.id > lastId) ?? all[0] ?? null;
}
