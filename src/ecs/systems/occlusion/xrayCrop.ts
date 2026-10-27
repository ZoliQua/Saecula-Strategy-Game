/** Horizontal crop of an X-ray silhouette and whether it is mirrored by a negative X scale. */
export interface XRayCrop {
  /** Crop x and width in the frame's unflipped logical-box px (Image.setCrop). */
  readonly x: number;
  readonly width: number;
  /** Draw with scaleX = −k and flipX off. */
  readonly mirror: boolean;
}

/**
 * Crop for the silhouette of a hidden run `left`..`left + width` (frame
 * px from the body's drawn left edge) of a body whose frame is
 * `realWidth` wide (its logical box) and origin X 0.5.
 *
 * A mirrored body is not copied with flipX: Phaser 3.80 crops a flipped
 * frame in unflipped coordinates but places the quad mirrored, and for a
 * trimmed frame (packed unit sheets) also mirrors the texels inside the
 * stored rectangle only, so the silhouette showed the wrong slice of the
 * body, offset sideways. Instead the crop names the unflipped columns the
 * body shows over the run, and a negative X scale mirrors them about the
 * origin (the box centre), for trimmed and untrimmed frames alike.
 */
export function xrayCrop(realWidth: number, left: number, width: number, flipX: boolean): XRayCrop {
  if (!flipX) return { x: left, width, mirror: false };
  return { x: realWidth - left - width, width, mirror: true };
}
