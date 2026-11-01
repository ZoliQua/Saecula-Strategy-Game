import { TILE_HEIGHT, TILE_WIDTH } from '../config/constants';

export interface TileCoord {
  readonly tx: number;
  readonly ty: number;
}

export interface ScreenCoord {
  readonly sx: number;
  readonly sy: number;
}

const HALF_W = TILE_WIDTH / 2;
const HALF_H = TILE_HEIGHT / 2;

export function tileToScreen(t: TileCoord): ScreenCoord {
  return {
    sx: (t.tx - t.ty) * HALF_W,
    sy: (t.tx + t.ty) * HALF_H,
  };
}

export function screenToTile(s: ScreenCoord): TileCoord {
  const tx = s.sx / HALF_W + s.sy / HALF_H;
  const ty = s.sy / HALF_H - s.sx / HALF_W;
  return { tx: tx / 2, ty: ty / 2 };
}

export function screenToTileFloor(s: ScreenCoord): TileCoord {
  // Diamond-accurate picking: the nearest tile *center* (in tile space)
  // is the one whose diamond contains the point on an iso grid. Flooring
  // the fractional tile coords picks the wrong triangle along the four
  // diagonal boundaries, so we round to nearest instead. This matches
  // the visual intuition "click ON the berry → berry tile", not the
  // grass tile that happens to share a vertex.
  const t = screenToTile(s);
  // Math.round can produce -0 for inputs in (-0.5, 0); normalise so
  // comparisons with {tx:0} behave as expected.
  const tx = Math.round(t.tx);
  const ty = Math.round(t.ty);
  return { tx: tx === 0 ? 0 : tx, ty: ty === 0 ? 0 : ty };
}

export function tileEquals(a: TileCoord, b: TileCoord): boolean {
  return a.tx === b.tx && a.ty === b.ty;
}

export function isInsideMap(
  t: TileCoord,
  width: number,
  height: number,
): boolean {
  return t.tx >= 0 && t.ty >= 0 && t.tx < width && t.ty < height;
}

/** Chebyshev (king-move) distance between two tiles: how unit ranges are measured. */
export function chebyshev(a: TileCoord, b: TileCoord): number {
  return Math.max(Math.abs(a.tx - b.tx), Math.abs(a.ty - b.ty));
}
