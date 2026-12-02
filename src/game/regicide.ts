import type { Entity } from '../ecs/components';
import type { EcsWorld } from '../ecs/world';
import type { TileCoord } from '../iso/coordinates';
import { reachMask } from '../map/gridSteps';
import type { MapData } from '../map/MapData';
import { TOWN_CENTER_SIZE, villagerSpawnTiles } from '../map/startLayout';

/* Regicide (M19): who still has a king, where it starts and what losing it leaves behind. */

/** The living kings on the map (none aboard a transport: crowns, the minimap and the notices follow these). */
export function* livingKings(world: EcsWorld) {
  for (const e of world.with('unit', 'owner', 'position')) {
    if (e.unit.unitType === 'king' && !e.dying) yield e;
  }
}

/** Whether `playerId` has a living king, on the map or aboard a living transport. A dying king is not alive. */
export function hasLivingKing(world: EcsWorld, playerId: number): boolean {
  const isTheirs = (u: Entity) => u.unit?.unitType === 'king' && u.owner?.playerId === playerId && !u.dying;
  for (const e of world.with('unit', 'owner')) {
    if (e.dying) continue;
    if (isTheirs(e) || e.cargo?.units.some(isTheirs)) return true;
  }
  return false;
}

/**
 * Where the king of the player starting at `start` stands: the nearest
 * ring round the town centre with a tile the middle villager can walk to
 * (so walls and terrain never trap it) that is no villager's tile, the
 * frontmost such tile of it (never hidden behind the town centre). No RNG.
 * Call it once buildings and preset walls block their tiles.
 */
export function kingStartTile(start: TileCoord, mapData: MapData): TileCoord {
  const { width, height } = mapData;
  const villagers = villagerSpawnTiles(start);
  const walkable = reachMask(mapData, villagers[1]!);
  const free = (tx: number, ty: number) =>
    tx >= 0 && ty >= 0 && tx < width && ty < height && walkable[ty * width + tx] === 1 && !villagers.some((v) => v.tx === tx && v.ty === ty);
  for (let r = Math.floor(TOWN_CENTER_SIZE / 2) + 1; r < Math.max(width, height); r++) {
    // Front to back: by screen depth (dx + dy), ties to the right.
    for (let depth = 2 * r; depth >= -2 * r; depth--) {
      for (let dx = r; dx >= -r; dx--) {
        const dy = depth - dx;
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (free(start.tx + dx, start.ty + dy)) return { tx: start.tx + dx, ty: start.ty + dy };
      }
    }
  }
  throw new RangeError(`no tile for a king at (${start.tx}, ${start.ty})`);
}

/**
 * A defeated player's town centre takes no orders. Every other rule
 * assumed that a defeated player has none (it lost by it); in Regicide it
 * may still stand after the king fell, and would grow a new economy.
 */
export function isRetiredTownCentre(building: Entity, owner: { readonly defeated?: boolean }): boolean {
  return owner.defeated === true && building.building?.type === 'town_center';
}
