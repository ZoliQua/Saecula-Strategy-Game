import type { TileCoord } from '../../iso/coordinates';
import type { MapData } from '../MapData';
import { TERRAIN } from '../TerrainTypes';
import { clearDisk, inBounds } from './startArea';

/**
 * A grass road `2 × halfWidth` tiles wide from `a` to `b`, bent through a
 * midpoint pushed `bend` tiles sideways (so roads don't run ruler-straight).
 */
export function carveCorridor(map: MapData, a: TileCoord, b: TileCoord, halfWidth: number, bend: number): void {
  const len = Math.hypot(b.tx - a.tx, b.ty - a.ty);
  if (len === 0) return;
  const nx = -(b.ty - a.ty) / len;
  const ny = (b.tx - a.tx) / len;
  const mid = { tx: (a.tx + b.tx) / 2 + nx * bend, ty: (a.ty + b.ty) / 2 + ny * bend };
  brushAlong(map, a, mid, halfWidth);
  brushAlong(map, mid, b, halfWidth);
}

function brushAlong(map: MapData, a: TileCoord, b: TileCoord, halfWidth: number): void {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.tx - a.tx, b.ty - a.ty) * 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    clearDisk(map, { tx: Math.round(a.tx + (b.tx - a.tx) * t), ty: Math.round(a.ty + (b.ty - a.ty) * t) }, halfWidth);
  }
}

/**
 * A walkable 4-connected line of grass from `a` to `b` (never a bare
 * diagonal step, which A* can't squeeze through), `width` 1 or 2 tiles:
 * the second lane runs alongside, offset across the line's main axis.
 */
export function carveBridge(map: MapData, a: TileCoord, b: TileCoord, width: 1 | 2): void {
  let x = a.tx;
  let y = a.ty;
  const dx = b.tx - a.tx;
  const dy = b.ty - a.ty;
  // The second lane sits beside the line: offset in y when it runs mostly along x, and vice versa.
  const lane = Math.abs(dx) >= Math.abs(dy) ? { tx: 0, ty: 1 } : { tx: 1, ty: 0 };
  const put = (tx: number, ty: number) => {
    if (inBounds(map, tx, ty)) map.setTile(tx, ty, TERRAIN.grass);
    if (width === 2 && inBounds(map, tx + lane.tx, ty + lane.ty)) map.setTile(tx + lane.tx, ty + lane.ty, TERRAIN.grass);
  };
  // Distance (scaled) of a tile from the ideal line a→b.
  const off = (tx: number, ty: number) => Math.abs((tx - a.tx) * dy - (ty - a.ty) * dx);
  put(x, y);
  while (x !== b.tx || y !== b.ty) {
    // One axis per step keeps the lane 4-connected; take the step that hugs the line.
    const stepX = x !== b.tx ? off(x + Math.sign(dx), y) : Infinity;
    const stepY = y !== b.ty ? off(x, y + Math.sign(dy)) : Infinity;
    if (stepX <= stepY) x += Math.sign(dx);
    else y += Math.sign(dy);
    put(x, y);
  }
}
