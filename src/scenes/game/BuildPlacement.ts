import type Phaser from 'phaser';
import { BUILDING_SPECS, createBuilding } from '../../ecs/archetypes/building';
import type { SelectionSystem } from '../../ecs/systems/SelectionSystem';
import type { EcsWorld } from '../../ecs/world';
import { ART_SCALE, BUILDING_BOTTOM_PAD } from '../../iso/art/canvas';
import type { TileCoord } from '../../iso/coordinates';
import { tileToScreen } from '../../iso/coordinates';
import { buildBlocker, countPlayerBuildings } from '../../game/buildRules';
import type { MapData } from '../../map/MapData';
import type { AgeId, BuildingType } from '../../types';
import { uiStore } from '../../ui/store';
import { WallLinePlacement } from './WallLinePlacement';

/** Building placement: translucent ghost under the cursor and site creation. */
export class BuildPlacement {
  private ghost: Phaser.GameObjects.Image | null = null;
  private readonly walls: WallLinePlacement;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: EcsWorld,
    private readonly mapData: MapData,
    private readonly selection: SelectionSystem,
    private readonly getHoverTile: () => TileCoord | null,
    private readonly getAge: () => AgeId = () => 1,
    private readonly playerId = 1,
  ) {
    this.walls = new WallLinePlacement(scene, world, mapData, selection, playerId);
  }

  /** Walls are laid by dragging a line instead of a single click. */
  isLineType(type: BuildingType | null): boolean {
    return type === 'wall';
  }

  beginWallLine(tile: TileCoord): void {
    if (this.canBuildType('wall')) this.walls.begin(tile);
  }

  isDraggingWallLine(): boolean {
    return this.walls.isDragging();
  }

  /** Releases the drag: builds the line; the wall tool stays active for more. */
  commitWallLine(hover: TileCoord | null): number {
    return this.walls.commit(hover);
  }

  cancelWallLine(): void {
    this.walls.cancel();
  }

  /** Age gate and per-player limits; the UI greys these out but this is the rule. */
  canBuildType(type: BuildingType): boolean {
    const existing = countPlayerBuildings(this.world.entities, this.playerId, type);
    return buildBlocker(type, this.getAge(), existing) === null;
  }

  canPlaceBuilding(origin: TileCoord, w: number, h: number): boolean {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (!this.mapData.isPassable(origin.tx + dx, origin.ty + dy)) {
          return false;
        }
      }
    }
    return true;
  }

  tryPlaceBuilding(origin: TileCoord, type: BuildingType): void {
    const spec = BUILDING_SPECS[type];
    if (!this.canBuildType(type)) return;
    if (!this.canPlaceBuilding(origin, spec.width, spec.height)) return;
    const state = uiStore.getState();
    if (
      state.resources.food < spec.cost.food ||
      state.resources.wood < spec.cost.wood ||
      state.resources.gold < spec.cost.gold
    ) {
      return;
    }
    state.setResources({
      food: state.resources.food - spec.cost.food,
      wood: state.resources.wood - spec.cost.wood,
      gold: state.resources.gold - spec.cost.gold,
    });
    const site = createBuilding(this.world, {
      type,
      origin,
      playerId: this.playerId,
      mapData: this.mapData,
      underConstruction: true,
    });
    const selected = this.selection.getSelected();
    if (selected && selected.gatherer && site.id !== undefined) {
      this.world.addComponent(selected, 'buildCommand', {
        targetId: site.id,
      });
    }
    state.setPlacementBuilding(null);
  }

  updateGhost(): void {
    const placement = uiStore.getState().placementBuilding;
    const hover = this.getHoverTile();
    if (placement !== 'wall') this.walls.cancel();
    if (!placement || !hover) {
      this.ghost?.setVisible(false);
      if (placement === 'wall') this.walls.updateGhosts(null);
      return;
    }
    if (placement === 'wall') {
      this.ghost?.setVisible(false);
      this.walls.updateGhosts(hover);
      return;
    }
    const spec = BUILDING_SPECS[placement];
    if (!this.ghost) {
      this.ghost = this.scene.add.image(0, 0, spec.textureKey);
      this.ghost.setAlpha(0.6).setScale(1 / ART_SCALE);
    }
    if (this.ghost.texture.key !== spec.textureKey) {
      this.ghost.setTexture(spec.textureKey);
    }
    const bottom = {
      tx: hover.tx + spec.width - 1,
      ty: hover.ty + spec.height - 1,
    };
    const { sx, sy } = tileToScreen(bottom);
    this.ghost.setPosition(sx, sy + 16);
    this.ghost.setOrigin(0.5, 1 - BUILDING_BOTTOM_PAD / this.ghost.height);
    const valid = this.canBuildType(placement) && this.canPlaceBuilding(hover, spec.width, spec.height);
    this.ghost.setTint(valid ? 0xbfffd0 : 0xff6666);
    this.ghost.setDepth(bottom.tx + bottom.ty + 0.25);
    this.ghost.setVisible(true);
  }
}
