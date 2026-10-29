import Phaser from 'phaser';
import { audio, type AudioSink } from '../../audio/AudioManager';
import type { Entity } from '../../ecs/components';
import type { SelectionSystem } from '../../ecs/systems/SelectionSystem';
import type { TileCoord } from '../../iso/coordinates';
import { tileEquals } from '../../iso/coordinates';
import { pickTile } from '../../iso/picking';
import type { TileMap } from '../../map/TileMap';
import { settingsStore } from '../../ui/settings';
import { uiStore } from '../../ui/store';
import type { BuildPlacement } from './BuildPlacement';
import { clickKind, type ClickKind } from './commandGesture';
import type { OrderIssuer } from './OrderIssuer';

const DRAG_THRESHOLD_PX = 8;

interface DragStart {
  sx: number;
  sy: number;
  screenX: number;
  screenY: number;
}

/** Pointer handling: hover, click selection, drag-select, orders (right button or the command gesture), placement. */
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
    /** An Esc with no placement or wall line to cancel (it opens the pause). */
    private readonly onIdleEscape: () => void,
    private readonly sounds: AudioSink = audio(),
    /** The human's player id (an own unit joining the selection plays the select sound). */
    private readonly humanId = 1,
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
    input.keyboard?.on('keydown-ESC', this.onEscape, this);
  }

  /** Removes the listeners register() added (also dropped by Phaser on scene shutdown). */
  unregister(): void {
    const input = this.scene.input;
    input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    input.keyboard?.off('keydown-ESC', this.onEscape, this);
  }

  /** A first Esc cancels a placement or a wall line; only an Esc with nothing to cancel opens the pause. */
  private onEscape(event?: KeyboardEvent): void {
    // A glass card on top (the pause, a slot list) already handled this Esc.
    if (event?.defaultPrevented) return;
    const opensPause = event?.repeat !== true;
    const busy = uiStore.getState().placementBuilding !== null || this.placement.isDraggingWallLine();
    this.placement.cancelWallLine();
    uiStore.getState().setPlacementBuilding(null);
    if (!busy && opensPause) this.onIdleEscape();
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

  /** Select or command: the right button, or a left click with the settings' gesture modifier, commands. */
  private clickKind(pointer: Phaser.Input.Pointer): ClickKind {
    const e = pointer.event;
    const gesture = settingsStore.getState().controls.commandGesture;
    if (e instanceof MouseEvent) return clickKind(e, gesture);
    // A touch: Phaser's flags (a touch is the primary button).
    return pointer.rightButtonDown() ? 'command' : pointer.leftButtonDown() ? 'select' : 'other';
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isPointerOverHud(pointer)) return;
    const tile = this.pick(pointer);
    const kind = this.clickKind(pointer);
    const placement = uiStore.getState().placementBuilding;
    if (placement) {
      if (kind === 'command') {
        this.placement.cancelWallLine();
        uiStore.getState().setPlacementBuilding(null);
        return;
      }
      if (kind === 'select' && tile) {
        if (this.placement.isLineType(placement)) this.placement.beginWallLine(tile);
        else this.placement.tryPlaceBuilding(tile, placement);
      }
      return;
    }
    if (kind === 'select') {
      const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.dragStart = { sx: world.x, sy: world.y, screenX: pointer.x, screenY: pointer.y };
      // Single-click selection fires on pointer UP (so drag-select is
      // possible). We still clear the tile outline here.
      this.tileMap.setSelectedTile(tile);
    } else if (kind === 'command' && tile) {
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
    if (this.placement.isDraggingWallLine()) {
      if (this.isPointerOverHud(pointer)) this.placement.cancelWallLine();
      else this.placement.commitWallLine(this.pick(pointer));
      return;
    }
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
    const before = new Set<Entity>(this.selection.getAllSelected());
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
    } else {
      // Simple click → select the tile under the cursor.
      const tile = this.pick(pointer);
      if (tile) this.selection.selectAtTile(tile.tx, tile.ty);
      else this.selection.clearSelection();
    }
    this.playSelectSound(before);
  }

  /** The select sound, when the selection gained one of the human's own units. */
  private playSelectSound(before: ReadonlySet<Entity>): void {
    const gained = this.selection
      .getAllSelected()
      .some((e) => !before.has(e) && e.unit !== undefined && e.owner?.playerId === this.humanId);
    if (gained) this.sounds.playSFX('unit_select');
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
