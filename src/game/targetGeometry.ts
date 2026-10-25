import type { Entity } from '../ecs/components';

export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Where an entity is right now in fractional tile space: buildings at
 * the centre of their footprint, moving units interpolated along their
 * current step.
 */
export function entityPoint(e: Entity & { position: { tx: number; ty: number } }): Point {
  const b = e.building;
  if (b) {
    return {
      x: e.position.tx + (b.footprint.width - 1) / 2,
      y: e.position.ty + (b.footprint.height - 1) / 2,
    };
  }
  const mv = e.movable;
  const next = mv?.path[0];
  if (mv && next && mv.progress > 0) {
    const t = Math.min(1, mv.progress);
    return {
      x: e.position.tx + (next.tx - e.position.tx) * t,
      y: e.position.ty + (next.ty - e.position.ty) * t,
    };
  }
  return { x: e.position.tx, y: e.position.ty };
}

/**
 * Distance from a point to an entity: euclidean to a unit, to the
 * nearest edge of the footprint (tile cells span +-0.5) for a building.
 */
export function distanceToEntity(
  p: Point,
  e: Entity & { position: { tx: number; ty: number } },
): number {
  const b = e.building;
  if (!b) {
    const c = entityPoint(e);
    return Math.hypot(p.x - c.x, p.y - c.y);
  }
  const minX = e.position.tx - 0.5;
  const maxX = e.position.tx + b.footprint.width - 0.5;
  const minY = e.position.ty - 0.5;
  const maxY = e.position.ty + b.footprint.height - 0.5;
  const dx = Math.max(minX - p.x, 0, p.x - maxX);
  const dy = Math.max(minY - p.y, 0, p.y - maxY);
  return Math.hypot(dx, dy);
}
