import Phaser from 'phaser';
import {
  ARROW_PAN_CODES,
  CAMERA_EDGE_MARGIN,
  CAMERA_SPEED,
  MAX_ZOOM,
  MIN_ZOOM,
  WHEEL_ZOOM_STEP,
} from '../../config/constants';
import { tileToScreen, type TileCoord } from '../../iso/coordinates';
import { settingsStore } from '../../ui/settings';
import { KeyState } from './KeyState';
import { wheelIntent, wheelPan, wheelZoomFactor, type WheelLike } from './wheelIntent';

export interface CameraControllerOptions {
  readonly edgeScroll?: boolean;
  /** Where key events are heard (default: window); tests pass a fake. */
  readonly keyTarget?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
}

/**
 * Handles key panning (the remappable pan keys from the settings store,
 * read every update, plus the fixed arrows), screen-edge pan, and the
 * wheel: a trackpad swipe pans, a pinch or a mouse wheel zooms around the
 * pointer (wheelIntent, with the settings' scroll mode). The camera is clamped by Phaser's camera bounds (set by the
 * owning scene), so no extra clamp logic is needed here.
 */
export class CameraController {
  private readonly scene: Phaser.Scene;
  private readonly camera: Phaser.Cameras.Scene2D.Camera;
  private readonly edgeScroll: boolean;
  private pointerInside = false;
  private readonly keyState: KeyState;

  constructor(scene: Phaser.Scene, options: CameraControllerOptions = {}) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.edgeScroll = options.edgeScroll ?? true;
    this.keyState = new KeyState(options.keyTarget);

    scene.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      this.onWheel,
      this,
    );

    const canvas = scene.game.canvas;
    canvas.addEventListener('mouseenter', this.onEnter);
    canvas.addEventListener('mouseleave', this.onLeave);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    // Every way out of the scene (quit, a load's restart, a failed start's return to the menu) shuts it down,
    // so the window key listeners and canvas / input handlers go with it.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  private readonly onEnter = (): void => {
    this.pointerInside = true;
  };

  private readonly onLeave = (): void => {
    this.pointerInside = false;
  };

  private onMove(): void {
    this.pointerInside = true;
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    const step = CAMERA_SPEED * dt / this.camera.zoom;

    let dx = 0;
    let dy = 0;

    const keys = settingsStore.getState().keys;
    const held = (action: keyof typeof ARROW_PAN_CODES): boolean =>
      this.keyState.isDown(keys[action].code) || this.keyState.isDown(ARROW_PAN_CODES[action]);
    if (held('panUp')) dy -= step;
    if (held('panDown')) dy += step;
    if (held('panLeft')) dx -= step;
    if (held('panRight')) dx += step;

    if (this.edgeScroll && this.pointerInside) {
      const p = this.scene.input.activePointer;
      const w = this.scene.scale.width;
      const h = this.scene.scale.height;
      if (p.x >= 0 && p.x <= CAMERA_EDGE_MARGIN) dx -= step;
      else if (p.x >= w - CAMERA_EDGE_MARGIN && p.x <= w) dx += step;
      if (p.y >= 0 && p.y <= CAMERA_EDGE_MARGIN) dy -= step;
      else if (p.y >= h - CAMERA_EDGE_MARGIN && p.y <= h) dy += step;
    }

    if (dx !== 0 || dy !== 0) {
      this.camera.scrollX += dx;
      this.camera.scrollY += dy;
    }
  }

  private readonly onWheel = (pointer: Phaser.Input.Pointer, _over: unknown[], dx: number, dy: number): void => {
    const native = pointer.event as Partial<WheelLike> | undefined;
    const e: WheelLike = {
      deltaX: native?.deltaX ?? dx,
      deltaY: native?.deltaY ?? dy,
      deltaMode: native?.deltaMode ?? 0,
      ctrlKey: native?.ctrlKey ?? false,
    };
    if (wheelIntent(e, settingsStore.getState().controls.scrollMode) === 'pan') {
      const pan = wheelPan(e, this.camera.zoom);
      this.camera.scrollX += pan.dx;
      this.camera.scrollY += pan.dy;
      return;
    }
    this.zoomAround(this.scene.input.activePointer.x, this.scene.input.activePointer.y, wheelZoomFactor(e));
  };

  /** Centres the view on `tile` (fractional tiles allowed: a footprint's middle). */
  centerOnTile(tile: TileCoord): void {
    const { sx, sy } = tileToScreen(tile);
    this.camera.centerOn(sx, sy);
  }

  /** One wheel notch of zoom around the screen centre: `dir` 1 in, -1 out (within MIN_ZOOM..MAX_ZOOM). */
  zoomStep(dir: 1 | -1): void {
    this.zoomAround(this.camera.width / 2, this.camera.height / 2, dir === 1 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP);
  }

  /** Multiplies the zoom by `factor` (within MIN_ZOOM..MAX_ZOOM), keeping the world point under screen (x, y) in place. */
  private zoomAround(x: number, y: number, factor: number): void {
    const before = this.camera.getWorldPoint(x, y);
    const newZoom = Phaser.Math.Clamp(this.camera.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    if (newZoom === this.camera.zoom) return;
    this.camera.setZoom(newZoom);
    const after = this.camera.getWorldPoint(x, y);
    this.camera.scrollX += before.x - after.x;
    this.camera.scrollY += before.y - after.y;
  }

  destroy(): void {
    this.keyState.destroy();
    this.scene.input.off(
      Phaser.Input.Events.POINTER_WHEEL,
      this.onWheel,
      this,
    );
    this.scene.input.off(
      Phaser.Input.Events.POINTER_MOVE,
      this.onMove,
      this,
    );
    const canvas = this.scene.game.canvas;
    canvas.removeEventListener('mouseenter', this.onEnter);
    canvas.removeEventListener('mouseleave', this.onLeave);
  }
}
