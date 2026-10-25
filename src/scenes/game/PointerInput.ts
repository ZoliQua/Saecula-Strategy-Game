import Phaser from 'phaser';
import type { SelectionSystem } from '../../ecs/systems/SelectionSystem';
import type { TileCoord } from '../../iso/coordinates';
import { tileEquals } from '../../iso/coordinates';
import { pickTile } from '../../iso/picking';
import type { TileMap } from '../../map/TileMap';
import { uiStore } from '../../ui/store';
import type { BuildPlacement } from './BuildPlacement';
import type { OrderIssuer } from './OrderIssuer';

const DRAG_THRESHOLD_PX = 8;

interface DragStart {
  sx: number;
  sy: number;
  screenX: number;
  screenY: number;
}

/** Pointer handling: hover, click selection, drag-select, orders, placement. */
export class PointerInput {
  private dragStart: DragStart | null = null;
  private dragRect: Phaser.GameObjects.Rectangle | null = null;
  private hoverTile: TileCoord | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly tileMap: TileMap,
    private readonly selection: SelectionSystem,
    private readonly placement: BuildPlacement,
    private readonly orders: OrderIssuer,
  ) {}

  getHoverTile(): TileCoord | null {
    return this.hoverTile;
  }

  register(): void {
    const input = this.scene.input;
    input.mouse?.disableContextMenu();
    input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    input.keyboard?.on('keydown-ESC', () => {
      uiStore.getState().setPlacementBuilding(null);
    });
  }

  private pick(pointer: Phaser.Input.Pointer): TileCoord | null {
    return pickTile(
      pointer.x,
      pointer.y,
      this.scene.cameras.main,
      this.tileMap.width,
      this.tileMap.height,
    );
  }

  /** The DOM HUD sits above the canvas; ignore pointer events aimed at it. */
  private isPointerOverHud(pointer: Phaser.Input.Pointer): boolean {
    const target = pointer.event?.target;
    return (
      target !== undefined &&
      target !== null &&
      target !== this.scene.game.canvas
    );
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    const tile = this.pick(pointer);
    if (tile === null && this.hoverTile !== null) {
      this.hoverTile = null;
      this.tileMap.setHoverTile(null);
    } else if (tile && (!this.hoverTile || !tileEquals(tile, this.hoverTile))) {
      this.hoverTile = tile;
      this.tileMap.setHoverTile(tile);
    }

    if (this.dragStart && pointer.leftButtonDown()) {
      const dx = pointer.x - this.dragStart.screenX;
      const dy = pointer.y - this.dragStart.screenY;
      if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD_PX) {
        this.updateDragRect(pointer);
      }
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isPointerOverHud(pointer)) return;
    const tile = this.pick(pointer);
    const placement = uiStore.getState().placementBuilding;
    if (placement) {
      if (pointer.rightButtonDown()) {
        uiStore.getState().setPlacementBuilding(null);
        return;
      }
      if (pointer.leftButtonDown() && tile) {
        this.placement.tryPlaceBuilding(tile, placement);
      }
      return;
    }
    if (pointer.leftButtonDown()) {
      const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.dragStart = { sx: world.x, sy: world.y, screenX: pointer.x, screenY: pointer.y };
      // Single-click selection fires on pointer UP (so drag-select is
      // possible). We still clear the tile outline here.
      this.tileMap.setSelectedTile(tile);
    } else if (pointer.rightButtonDown() && tile) {
      this.orders.issueOrders(tile);
    }
  }

  private clearDragRect(): void {
    if (this.dragRect) {
      this.dragRect.destroy();
      this.dragRect = null;
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.isPointerOverHud(pointer)) {
      this.dragStart = null;
      this.clearDragRect();
      return;
    }
    if (!this.dragStart) return;
    const start = this.dragStart;
    this.dragStart = null;

    const dx = pointer.x - start.screenX;
    const dy = pointer.y - start.screenY;
    const didDrag = Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD_PX;
    this.clearDragRect();
    if (didDrag) {
      const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const additive = pointer.event?.shiftKey ?? false;
      this.selection.selectUnitsInWorldRect(
        start.sx,
        start.sy,
        world.x,
        world.y,
        1,
        additive,
      );
      return;
    }
    // Simple click → select the tile under the cursor.
    const tile = this.pick(pointer);
    if (tile) this.selection.selectAtTile(tile.tx, tile.ty);
    else this.selection.clearSelection();
  }

  private updateDragRect(pointer: Phaser.Input.Pointer): void {
    if (!this.dragStart) return;
    if (!this.dragRect) {
      this.dragRect = this.scene.add
        .rectangle(0, 0, 1, 1, 0x8bc34a, 0.12)
        .setStrokeStyle(1, 0x8bc34a, 0.9)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(10_000);
    }
    const x0 = Math.min(this.dragStart.screenX, pointer.x);
    const y0 = Math.min(this.dragStart.screenY, pointer.y);
    const x1 = Math.max(this.dragStart.screenX, pointer.x);
    const y1 = Math.max(this.dragStart.screenY, pointer.y);
    this.dragRect.setPosition(x0, y0);
    this.dragRect.setSize(x1 - x0, y1 - y0);
  }
}
