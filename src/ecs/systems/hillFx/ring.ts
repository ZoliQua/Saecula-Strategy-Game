import { HILL } from '../../../config/balance';
import { HILL_MARK } from '../../../config/visual';
import type { TileCoord } from '../../../iso/coordinates';

/* The hill's ground ring in tile space (M19). */

/** The zone's edge with rounded corners, as a closed polygon in fractional tiles. */
export function hillOutline(centre: TileCoord): TileCoord[] {
  const { cornerRadius: r, cornerSteps: steps } = HILL_MARK.ring;
  const straight = HILL.size / 2 - r;
  const points: TileCoord[] = [];
  for (const [quarter, sx, sy] of [[0, 1, 1], [1, -1, 1], [2, -1, -1], [3, 1, -1]] as const) {
    for (let i = 0; i <= steps; i++) {
      const angle = ((quarter + i / steps) * Math.PI) / 2;
      points.push({ tx: centre.tx + sx * straight + r * Math.cos(angle), ty: centre.ty + sy * straight + r * Math.sin(angle) });
    }
  }
  return points;
}

/** A closed path cut into dashes `length` long with `gap` between them; a dash bends round corners. */
export function dashes(closed: readonly TileCoord[], length: number, gap: number): TileCoord[][] {
  const out: TileCoord[][] = [];
  const first = closed[0];
  if (!first) return out;
  let dash: TileCoord[] = [first];
  let on = true;
  let left = length;
  closed.forEach((a, i) => {
    const b = closed[(i + 1) % closed.length] ?? first;
    const span = Math.hypot(b.tx - a.tx, b.ty - a.ty);
    let at = 0;
    while (span - at > 1e-9) {
      const step = Math.min(left, span - at);
      at += step;
      left -= step;
      const point = { tx: a.tx + ((b.tx - a.tx) * at) / span, ty: a.ty + ((b.ty - a.ty) * at) / span };
      if (on) dash.push(point);
      if (left > 1e-9) continue;
      if (on) out.push(dash);
      on = !on;
      left = on ? length : gap;
      dash = [point];
    }
  });
  if (on && dash.length > 1) out.push(dash);
  return out;
}
