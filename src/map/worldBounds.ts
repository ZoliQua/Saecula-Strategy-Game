import { tileToScreen } from '../iso/coordinates';

export interface WorldBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** World-coord bounds of the tile centres of a width × height map. */
export function mapWorldBounds(width: number, height: number): WorldBounds {
  const corners = [
    tileToScreen({ tx: 0, ty: 0 }),
    tileToScreen({ tx: width - 1, ty: 0 }),
    tileToScreen({ tx: 0, ty: height - 1 }),
    tileToScreen({ tx: width - 1, ty: height - 1 }),
  ];
  const xs = corners.map((c) => c.sx);
  const ys = corners.map((c) => c.sy);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}
