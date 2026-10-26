import type { TileCoord } from '../../iso/coordinates';
import { wallLineTiles } from '../../game/wallLine';

/** Unit step (each axis -1, 0 or 1) from `from` toward `to`, snapped to the eight tile directions. */
export function directionToward(from: TileCoord, to: TileCoord): TileCoord | null {
  const dx = to.tx - from.tx;
  const dy = to.ty - from.ty;
  if (dx === 0 && dy === 0) return null;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  // Within ~22.5 degrees of an axis: straight; otherwise diagonal.
  const sx = ay > ax * 2.414 ? 0 : Math.sign(dx);
  const sy = ax > ay * 2.414 ? 0 : Math.sign(dy);
  return { tx: sx, ty: sy };
}

/** The tile `distance` steps from `home` toward `threat` (a tower spot facing the attacks). */
export function pointToward(home: TileCoord, threat: TileCoord, distance: number): TileCoord | null {
  const d = directionToward(home, threat);
  if (!d) return null;
  // Diagonal steps cover more ground; scale them so the spot sits about `distance` out.
  const steps = d.tx !== 0 && d.ty !== 0 ? Math.round(distance / Math.SQRT2) : distance;
  return { tx: home.tx + d.tx * steps, ty: home.ty + d.ty * steps };
}

/**
 * A straight (or 45 degree) wall line across the approach from `threat`:
 * centred `distance` tiles out from `home` toward it, perpendicular to that
 * direction, `halfLength` tiles to each side. Uses the same line rules as
 * the player's wall drag (wallLineTiles).
 */
export function wallLineAcross(home: TileCoord, threat: TileCoord, distance: number, halfLength: number): TileCoord[] {
  const d = directionToward(home, threat);
  const centre = pointToward(home, threat, distance);
  if (!d || !centre) return [];
  const across = { tx: -d.ty, ty: d.tx };
  const reach = d.tx !== 0 && d.ty !== 0 ? Math.round(halfLength / Math.SQRT2) : halfLength;
  const start = { tx: centre.tx - across.tx * reach, ty: centre.ty - across.ty * reach };
  const end = { tx: centre.tx + across.tx * reach, ty: centre.ty + across.ty * reach };
  return wallLineTiles(start, end);
}
