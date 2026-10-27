import type { TileCoord } from '../../../iso/coordinates';
import type { MapData } from '../../../map/MapData';
import type { Entity } from '../../components';
import type { Dropoff, ResourceNode } from './gatherTypes';

/* Tile geometry of the gather cycle: who stands next to what, and which free tile to walk to. */

export function isAdjacentToNode(v: TileCoord, node: ResourceNode): boolean {
  const b = (node as Entity).building;
  if (!b) {
    const dx = Math.abs(v.tx - node.position.tx);
    const dy = Math.abs(v.ty - node.position.ty);
    return dx <= 1 && dy <= 1;
  }
  return (
    v.tx >= node.position.tx - 1 &&
    v.tx <= node.position.tx + b.footprint.width &&
    v.ty >= node.position.ty - 1 &&
    v.ty <= node.position.ty + b.footprint.height
  );
}

export function isAdjacentToFootprint(v: TileCoord, d: Dropoff): boolean {
  const { width, height } = d.building.footprint;
  const x0 = d.position.tx - 1;
  const y0 = d.position.ty - 1;
  const x1 = d.position.tx + width;
  const y1 = d.position.ty + height;
  return v.tx >= x0 && v.tx <= x1 && v.ty >= y0 && v.ty <= y1;
}

export function findAdjacentPassable(
  map: MapData,
  target: TileCoord,
  preferNear: TileCoord,
): TileCoord | null {
  const candidates: TileCoord[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const tile = { tx: target.tx + dx, ty: target.ty + dy };
      if (map.isPassable(tile.tx, tile.ty)) candidates.push(tile);
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => manhattan(a, preferNear) - manhattan(b, preferNear));
  return candidates[0]!;
}

export function findAdjacentToBuildingNode(
  map: MapData,
  node: ResourceNode,
  preferNear: TileCoord,
): TileCoord | null {
  const b = (node as Entity).building;
  if (!b) return null;
  const { width, height } = b.footprint;
  const candidates: TileCoord[] = [];
  for (let dx = -1; dx <= width; dx++) {
    candidates.push({ tx: node.position.tx + dx, ty: node.position.ty - 1 });
    candidates.push({ tx: node.position.tx + dx, ty: node.position.ty + height });
  }
  for (let dy = 0; dy < height; dy++) {
    candidates.push({ tx: node.position.tx - 1, ty: node.position.ty + dy });
    candidates.push({ tx: node.position.tx + width, ty: node.position.ty + dy });
  }
  const passable = candidates.filter((t) => map.isPassable(t.tx, t.ty));
  if (passable.length === 0) return null;
  passable.sort(
    (a, b2) =>
      Math.abs(a.tx - preferNear.tx) + Math.abs(a.ty - preferNear.ty) -
      (Math.abs(b2.tx - preferNear.tx) + Math.abs(b2.ty - preferNear.ty)),
  );
  return passable[0]!;
}

export function findAdjacentToFootprint(
  map: MapData,
  d: Dropoff,
  preferNear: TileCoord,
): TileCoord | null {
  const { width, height } = d.building.footprint;
  const candidates: TileCoord[] = [];
  for (let dx = -1; dx <= width; dx++) {
    for (const dy of [-1, height]) {
      candidates.push({ tx: d.position.tx + dx, ty: d.position.ty + dy });
    }
  }
  for (let dy = 0; dy < height; dy++) {
    candidates.push({ tx: d.position.tx - 1, ty: d.position.ty + dy });
    candidates.push({ tx: d.position.tx + width, ty: d.position.ty + dy });
  }
  const passable = candidates.filter((t) => map.isPassable(t.tx, t.ty));
  if (passable.length === 0) return null;
  passable.sort((a, b) => manhattan(a, preferNear) - manhattan(b, preferNear));
  return passable[0]!;
}

export function manhattan(a: TileCoord, b: TileCoord): number {
  return Math.abs(a.tx - b.tx) + Math.abs(a.ty - b.ty);
}

export function footprintDistance(v: TileCoord, d: Dropoff): number {
  const { width, height } = d.building.footprint;
  const cx = d.position.tx + (width - 1) / 2;
  const cy = d.position.ty + (height - 1) / 2;
  return Math.abs(v.tx - cx) + Math.abs(v.ty - cy);
}
