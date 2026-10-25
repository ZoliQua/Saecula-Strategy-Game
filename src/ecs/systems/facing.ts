import type { TileCoord } from '../../iso/coordinates';
import { directionFromDelta } from '../../types';
import type { Entity } from '../components';

/**
 * Turns a working / fighting unit towards what it works on (cosmetic:
 * only `movable.facing`, which the renderer uses to pick the heading).
 * Multi-tile targets are faced at their footprint centre.
 */
export function faceToward(unit: Entity, target: Entity): void {
  const mv = unit.movable;
  const from = unit.position;
  if (!mv || !from || !target.position) return;
  const c = centre(target.position, target.building?.footprint);
  const dx = c.tx - from.tx;
  const dy = c.ty - from.ty;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return;
  mv.facing = directionFromDelta(dx, dy);
}

function centre(p: TileCoord, fp: { width: number; height: number } | undefined): TileCoord {
  return fp ? { tx: p.tx + (fp.width - 1) / 2, ty: p.ty + (fp.height - 1) / 2 } : p;
}
