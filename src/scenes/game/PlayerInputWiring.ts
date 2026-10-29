import Phaser from 'phaser';
import type { SelectionSystem } from '../../ecs/systems/SelectionSystem';
import type { EcsWorld } from '../../ecs/world';
import type { MapData } from '../../map/MapData';
import type { TileMap } from '../../map/TileMap';
import type { AgeId, CivId } from '../../types';
import { BuildPlacement } from './BuildPlacement';
import { wireBuildingDeletion } from './BuildingDeletion';
import { wireCursor } from './CursorWiring';
import { OrderIssuer } from './OrderIssuer';
import { PointerInput } from './PointerInput';

export interface PlayerInputDeps {
  readonly world: EcsWorld;
  readonly mapData: MapData;
  readonly tileMap: TileMap;
  readonly selection: SelectionSystem;
  readonly humanId: number;
  readonly civ: CivId;
  readonly age: () => AgeId;
  /** An Esc with nothing to cancel (it opens the pause). */
  readonly onIdleEscape: () => void;
}

/**
 * The human's input for a match: orders, building placement, the pointer
 * (selection, commands by right button or the command gesture), the
 * contextual cursor and building deletion (its key through onKeyAction).
 * Everything unwires on scene shutdown. Returns the placement, whose
 * ghost the scene updates each frame.
 */
export function wirePlayerInput(scene: Phaser.Scene, d: PlayerInputDeps): BuildPlacement {
  const orders = new OrderIssuer(d.world, d.selection);
  // The placement ghost and the cursor read the hover tile from the pointer handler.
  let pointer: PointerInput | null = null;
  const hoverTile = () => pointer?.getHoverTile() ?? null;
  const placement = new BuildPlacement(scene, d.world, d.mapData, d.selection, hoverTile, d.age, d.humanId, d.civ);
  pointer = new PointerInput(scene, d.tileMap, d.selection, placement, orders, d.onIdleEscape, undefined, d.humanId);
  pointer.register();
  const registered = pointer;
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => registered.unregister());
  wireCursor(scene, d.world, d.mapData, d.selection, hoverTile, d.humanId);
  wireBuildingDeletion(scene, d.world, d.humanId);
  return placement;
}
