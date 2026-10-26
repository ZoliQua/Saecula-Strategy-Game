import { poly } from '../canvas';
import { HW, type IsoPainter, type WallStyle } from '../isoPainter';
import { baked } from '../lighting/normalLayer';
import { N_UP, normalize, SCREEN_PER_WORLD_HEIGHT, slopeNormal, tileToView } from '../lighting/viewSpace';
import { css, shade } from '../palette';
import { paintWallDetail } from '../wallDetail';

/** A ground point in tile axes (u, v). */
export type UV = readonly [number, number];
type Pt = readonly [number, number];

export interface PrismStyle extends WallStyle {
  /** Top face colour (default: the wall colour, lightened). */
  readonly top?: number;
  /** Batter: how much narrower (tiles, per side) the top is than the base. */
  readonly batter?: number;
  /** Extra face-local painting (openings, cordons) on each visible long side. */
  readonly face?: (width: number, height: number, light: number) => void;
}

/**
 * A wall slab running from `a` to `b` on the ground, `half` tiles to
 * each side of that line, from z0 to z1 (art px) — IsoPainter's box for
 * any direction, so walls can run diagonally. Only the long sides that
 * face the viewer are painted (end faces always abut a neighbour or a
 * post); each gets the painter's lighting data: baked shade by its
 * facing, a matching normal (tilted for battered faces), and shadow
 * volume points at the top corners.
 */
export function prism(p: IsoPainter, a: UV, b: UV, half: number, z0: number, z1: number, style: PrismStyle): void {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const du = (b[0] - a[0]) / len;
  const dv = (b[1] - a[1]) / len;
  // Side normal (perpendicular to the run in the ground plane).
  const nu = -dv;
  const nv = du;
  const inset = Math.min(half * 0.9, style.batter ?? 0);
  const top = half - inset;
  const at = (q: UV, side: number, w: number, z: number): Pt => p.p(q[0] + nu * side * w, q[1] + nv * side * w, z);
  for (const side of [1, -1]) {
    const ou = nu * side;
    const ov = nv * side;
    if (ou + ov <= 1e-6) continue;
    const pts = [at(a, side, half, z0), at(b, side, half, z0), at(b, side, top, z1), at(a, side, top, z1)];
    const s = (ov - ou) / Math.SQRT2;
    const light = baked(0.86 + 0.198 * s + (inset > 0 ? 0.05 : 0));
    const ys = pts.map((q) => q[1]);
    const g = p.ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
    g.addColorStop(0, css(shade(style.color, light * 1.06)));
    g.addColorStop(0.75, css(shade(style.color, light * 0.96)));
    g.addColorStop(1, css(shade(style.color, light * baked(0.7))));
    p.fillPoly(pts, g);
    const normal =
      inset > 0
        ? slopeNormal(ou, ov, inset * HW * Math.SQRT2, (z1 - z0) / SCREEN_PER_WORLD_HEIGHT)
        : normalize(tileToView(ou, ov, 0));
    p.normals.fill(pts, normal);
    onFace(p, pts, z1 - z0, (w, h) => {
      if (style.detail) paintWallDetail(p.ctx, () => p.random(), style, w, h, light);
      style.face?.(w, h, light);
    });
    // Only the long edges: outlining the ends would mark a seam at every tile joint.
    edge(p, pts[3]!, pts[2]!, css(shade(style.color, 1.25), 0.45));
    edge(p, pts[0]!, pts[1]!, css(shade(style.color, 0.35), 0.5));
  }
  const topPts = [at(a, 1, top, z1), at(b, 1, top, z1), at(b, -1, top, z1), at(a, -1, top, z1)];
  p.fillPoly(topPts, css(shade(style.top ?? style.color, 1.1)));
  p.normals.fill(topPts, N_UP);
  for (const side of [1, -1]) {
    for (const q of [a, b]) p.addVolumePoint(q[0] + nu * side * top, q[1] + nv * side * top, z1);
  }
}

/**
 * Runs `draw` mapped onto a vertical (or battered) face given as
 * [bottom-start, bottom-end, top-end, top-start]: face-local x runs
 * left to right along the bottom edge, y up the face as negative values.
 */
export function onFace(p: IsoPainter, pts: readonly Pt[], height: number, draw: (width: number, height: number) => void): void {
  const [b0, b1] = pts[0]![0] <= pts[1]![0] ? [pts[0]!, pts[1]!] : [pts[1]!, pts[0]!];
  const width = b1[0] - b0[0];
  if (width < 0.5) return;
  const ctx = p.ctx;
  ctx.save();
  poly(ctx, pts);
  ctx.clip();
  ctx.setTransform(1, (b1[1] - b0[1]) / width, 0, 1, b0[0], b0[1]);
  draw(width, height);
  ctx.restore();
}

function edge(p: IsoPainter, a: Pt, b: Pt, color: string): void {
  p.ctx.strokeStyle = color;
  p.ctx.lineWidth = 1.1;
  p.ctx.beginPath();
  p.ctx.moveTo(a[0], a[1]);
  p.ctx.lineTo(b[0], b[1]);
  p.ctx.stroke();
}
