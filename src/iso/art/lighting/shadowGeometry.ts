import type { ShadowVector } from './sun';

export type Pt2 = readonly [number, number];

/**
 * A point of a building's volume, in texture px: its ground point
 * (gx, gy) and painted height z above it. Recorded by IsoPainter.
 */
export interface VolumePoint {
  readonly gx: number;
  readonly gy: number;
  readonly z: number;
}

/** Convex hull (Andrew's monotone chain), counter-clockwise, no duplicates. */
export function convexHull(points: readonly Pt2[]): Pt2[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o: Pt2, a: Pt2, b: Pt2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt2[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt2[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Projects volume points onto the ground along the shadow vector and
 * returns the shadow outline (convex hull) in texture px. Ground
 * points (z = 0) stay put, so the outline starts at the footprint.
 * `heightScale` shrinks the volume (buildings under construction).
 */
export function projectVolumeShadow(points: readonly VolumePoint[], sv: ShadowVector, heightScale = 1): Pt2[] {
  const out: Pt2[] = [];
  for (const p of points) {
    out.push([p.gx, p.gy]);
    if (p.z > 0) out.push([p.gx + p.z * heightScale * sv.x, p.gy + p.z * heightScale * sv.y]);
  }
  return convexHull(out);
}

/** Scales a polygon about its centroid (soft shadow edge rings). */
export function inflate(poly: readonly Pt2[], factor: number): Pt2[] {
  if (poly.length === 0) return [];
  let cx = 0;
  let cy = 0;
  for (const [x, y] of poly) {
    cx += x;
    cy += y;
  }
  cx /= poly.length;
  cy /= poly.length;
  return poly.map(([x, y]) => [cx + (x - cx) * factor, cy + (y - cy) * factor] as const);
}

/**
 * Corners of a silhouette quad laid on the ground: a texel `h` px above
 * the pivot (feet) lands h·sv away along the shadow, and its sideways
 * offset runs across the shadow (perp), treating the caster as roughly
 * round. Inputs are local px relative to the pivot (y down); returns
 * TL, BL, BR, TR offsets.
 */
export function shearQuad(left: number, top: number, right: number, bottom: number, sv: ShadowVector): [Pt2, Pt2, Pt2, Pt2] {
  const at = (x: number, y: number): Pt2 => [x * sv.px - y * sv.x, x * sv.py - y * sv.y];
  return [at(left, top), at(left, bottom), at(right, bottom), at(right, top)];
}
