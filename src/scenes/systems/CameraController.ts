import Phaser from 'phaser';
import {
  ARROW_PAN_CODES,
  CAMERA_EDGE_MARGIN,
  CAMERA_SPEED,
  MAX_ZOOM,
  MIN_ZOOM,
} from '../../config/constants';
import { settingsStore } from '../../ui/settings';
import { KeyState } from './KeyState';

export interface CameraControllerOptions {
  readonly edgeScroll?: boolean;
}

/**
 * Handles key panning (the remappable pan keys from the settings store,
 * read every update, plus the fixed arrows), screen-edge pan, and mouse-wheel
 * zoom. The camera is clamped by Phaser's camera bounds (set by the
 * owning scene), so no extra clamp logic is needed here.
 */
export class CameraController {
  private readonly scene: Phaser.Scene;
  private readonly camera: Phaser.Cameras.Scene2D.Camera;
  private readonly edgeScroll: boolean;
  private pointerInside = false;
  private readonly keyState = new KeyState();

  constructor(scene: Phaser.Scene, options: CameraControllerOptions = {}) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.edgeScroll = options.edgeScroll ?? true;

    scene.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      this.onWheel,
      this,
    );

    const canvas = scene.game.canvas;
    canvas.addEventListener('mouseenter', this.onEnter);
    canvas.addEventListener('mouseleave', this.onLeave);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
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

  private onWheel(
    _pointer: Phaser.Input.Pointer,
    _over: unknown[],
    _dx: number,
    dy: number,
  ): void {
    const worldPoint = this.camera.getWorldPoint(
      this.scene.input.activePointer.x,
      this.scene.input.activePointer.y,
    );
    const factor = dy > 0 ? 1 / 1.1 : 1.1;
    const newZoom = Phaser.Math.Clamp(
      this.camera.zoom * factor,
      MIN_ZOOM,
      MAX_ZOOM,
    );
    if (newZoom === this.camera.zoom) return;
    this.camera.setZoom(newZoom);

    const afterPoint = this.camera.getWorldPoint(
      this.scene.input.activePointer.x,
      this.scene.input.activePointer.y,
    );
    this.camera.scrollX += worldPoint.x - afterPoint.x;
    this.camera.scrollY += worldPoint.y - afterPoint.y;
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
