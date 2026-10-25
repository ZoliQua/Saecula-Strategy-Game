import { TILE_HEIGHT } from '../../config/constants';
import { tileToScreen } from '../../iso/coordinates';

export interface ProjectilePoint {
  readonly x: number;
  readonly y: number;
}

export interface ProjectileMotion {
  /** Ground position in fractional tile space. */
  readonly x: number;
  readonly y: number;
  /** Height above the ground in tiles (parabola, 0 at both ends). */
  readonly height: number;
  /** Screen-space x/y including the height lift. */
  readonly sx: number;
  readonly sy: number;
  /** Screen-space travel direction in radians (atan2 of dy, dx). */
  readonly angle: number;
}

/** Flight time in ms for a distance at a speed (tiles/s), never below minMs. */
export function flightDurationMs(distance: number, speed: number, minMs: number): number {
  return Math.max(minMs, (distance / speed) * 1000);
}

/**
 * Position, arc height and tangent angle of a projectile at flight
 * fraction `t` (clamped to 0..1). Height is a parabola peaking at
 * `arcHeight` tiles; one tile of height lifts the sprite TILE_HEIGHT px.
 */
export function projectileMotion(
  from: ProjectilePoint,
  to: ProjectilePoint,
  t: number,
  arcHeight: number,
): ProjectileMotion {
  const k = Math.min(1, Math.max(0, t));
  const x = from.x + (to.x - from.x) * k;
  const y = from.y + (to.y - from.y) * k;
  const height = 4 * arcHeight * k * (1 - k);
  const s = tileToScreen({ tx: x, ty: y });
  const a = tileToScreen({ tx: from.x, ty: from.y });
  const b = tileToScreen({ tx: to.x, ty: to.y });
  const dHeight = 4 * arcHeight * (1 - 2 * k);
  const dx = b.sx - a.sx;
  const dy = b.sy - a.sy - dHeight * TILE_HEIGHT;
  return { x, y, height, sx: s.sx, sy: s.sy - height * TILE_HEIGHT, angle: Math.atan2(dy, dx) };
}
