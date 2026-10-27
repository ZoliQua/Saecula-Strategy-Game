import { footprintDepth } from '../../../iso/depth';
import type { Entity } from '../../components';
import type { EcsWorld } from '../../world';
import { BUILDING_DEPTH_OFFSET } from '../renderPlacement';

/** What CliffBuildingSort needs of the map view (TileMap.buildingDepthBesideCliffs). */
export interface CliffSorter {
  buildingDepthBesideCliffs(fx: number, fy: number, w: number, h: number, depth: number): number;
}

/**
 * Keeps raised rock beside a building's front walls drawn over the
 * building (render state only): a building with cliff occluders in front
 * of its +u / +v walls draws just below them (RenderSystem asks
 * `depthOf`). Terrain never changes, so each building's depth is computed
 * once when it appears.
 */
export class CliffBuildingSort {
  private readonly depths = new Map<Entity, number>();
  private readonly unsubscribe: Array<() => void> = [];

  constructor(world: EcsWorld, map: CliffSorter) {
    const buildings = world.with('building', 'position');
    const add = (e: Entity): void => {
      const b = e.building;
      const p = e.position;
      if (!b || !p || this.depths.has(e)) return;
      const { width: w, height: h } = b.footprint;
      const depth = footprintDepth(p, w, h) + BUILDING_DEPTH_OFFSET;
      const sorted = map.buildingDepthBesideCliffs(p.tx, p.ty, w, h, depth);
      if (sorted < depth) this.depths.set(e, sorted);
    };
    for (const e of buildings) add(e);
    this.unsubscribe.push(buildings.onEntityAdded.subscribe(add));
    this.unsubscribe.push(buildings.onEntityRemoved.subscribe((e) => this.depths.delete(e)));
  }

  /** The draw depth of building `e` normally drawn at `depth`. */
  depthOf(e: Entity, depth: number): number {
    return this.depths.get(e) ?? depth;
  }

  destroy(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe.length = 0;
    this.depths.clear();
  }
}
