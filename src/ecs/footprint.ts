import type { TileCoord } from '../iso/coordinates';

/** Footprint size in tiles. */
export interface FootprintSize {
  readonly width: number;
  readonly height: number;
}

/** Whether `v` lies on the footprint at `origin` (its top tile). */
export function insideFootprint(v: TileCoord, origin: TileCoord, size: FootprintSize): boolean {
  return v.tx >= origin.tx && v.tx < origin.tx + size.width && v.ty >= origin.ty && v.ty < origin.ty + size.height;
}

/**
 * Whether `v` is on the ring of tiles around the footprint (corners included),
 * not inside it: the tiles a unit works a building from. A unit inside the
 * footprint (a foundation laid over it) has to step out first.
 */
export function onFootprintRing(v: TileCoord, origin: TileCoord, size: FootprintSize): boolean {
  const inRing =
    v.tx >= origin.tx - 1 && v.tx <= origin.tx + size.width && v.ty >= origin.ty - 1 && v.ty <= origin.ty + size.height;
  return inRing && !insideFootprint(v, origin, size);
}

/**
 * The centre tile of the footprint at `origin` (its top tile): fractional
 * for even sizes (a 2×2 at (4, 4) → (4.5, 4.5)), the middle tile for odd.
 */
export function footprintCentre(origin: TileCoord, size: FootprintSize): TileCoord {
  return { tx: origin.tx + (size.width - 1) / 2, ty: origin.ty + (size.height - 1) / 2 };
}
