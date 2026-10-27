import { footprintDepth } from '../../../iso/depth';
import type { Entity } from '../../components';
import type { EcsWorld } from '../../world';
import { BUILDING_DEPTH_OFFSET } from '../renderPlacement';

/** What CliffBuildingSort needs of the map view (TileMap.sortCliffsAboveBuilding). */
export interface CliffSorter {
  sortCliffsAboveBuilding(fx: number, fy: number, w: number, h: number, depth: number): () => void;
}

/**
 * Keeps raised rock beside a building's front walls drawn over the
 * building (render state only): while a building exists, the cliff
 * occluders in front of its +u / +v walls sort just above its sprite.
 */
export class CliffBuildingSort {
  private readonly release = new Map<Entity, () => void>();
  private readonly unsubscribe: Array<() => void> = [];

  constructor(world: EcsWorld, map: CliffSorter) {
    const buildings = world.with('building', 'position');
    const add = (e: Entity): void => {
      const b = e.building;
      const p = e.position;
      if (!b || !p || this.release.has(e)) return;
      const { width: w, height: h } = b.footprint;
      this.release.set(e, map.sortCliffsAboveBuilding(p.tx, p.ty, w, h, footprintDepth(p, w, h) + BUILDING_DEPTH_OFFSET));
    };
    for (const e of buildings) add(e);
    this.unsubscribe.push(buildings.onEntityAdded.subscribe(add));
    this.unsubscribe.push(
      buildings.onEntityRemoved.subscribe((e) => {
        this.release.get(e)?.();
        this.release.delete(e);
      }),
    );
  }

  destroy(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe.length = 0;
    for (const r of this.release.values()) r();
    this.release.clear();
  }
}
