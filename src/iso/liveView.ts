/** A camera's world-space view rectangle. */
export interface ViewRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly right: number;
  readonly bottom: number;
}

/** The camera fields liveView reads. */
export interface CameraLike {
  readonly width: number;
  readonly height: number;
  readonly zoom: number;
  readonly scrollX: number;
  readonly scrollY: number;
}

/**
 * The camera's world view from its current scroll and zoom. Phaser's
 * `worldView` is only refreshed while the camera renders, so right after
 * a jump (minimap click) it still holds the previous frame's view: cull
 * against this instead.
 */
export function liveView(cam: CameraLike): ViewRect {
  const width = cam.width / cam.zoom;
  const height = cam.height / cam.zoom;
  const x = cam.scrollX + (cam.width - width) / 2;
  const y = cam.scrollY + (cam.height - height) / 2;
  return { x, y, width, height, right: x + width, bottom: y + height };
}
