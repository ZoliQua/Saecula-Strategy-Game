import { forbidBuildingOnHill } from '../../game/hill';
import type { TileCoord } from '../../iso/coordinates';
import type { MapData } from '../../map/MapData';
import type { Entity } from '../components';
import { assignEntityId, type EcsWorld } from '../world';

/**
 * The hill of King of the Hill (M19): an ownerless entity with nothing but
 * its centre and its clocks, so it is never drawn as a sprite, selected,
 * attacked or in the way. Its zone takes no building.
 */
export function createHill(world: EcsWorld, mapData: MapData, centre: TileCoord): Entity {
  const hill = assignEntityId({
    position: { tx: centre.tx, ty: centre.ty },
    hill: { heldMs: {}, holderTeam: null, contested: false },
  });
  world.add(hill);
  forbidBuildingOnHill(mapData, centre);
  return hill;
}
