import { HW, type IsoPainter, type WallStyle } from '../../isoPainter';
import { baked } from '../../lighting/normalLayer';
import { N_LEFT, N_RIGHT, N_UP, SCREEN_PER_WORLD_HEIGHT, slopeNormal } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import { paintWallDetail } from '../../wallDetail';
import { onFace, type UV } from '../prism';
import type { Arm } from '../wallKit';

type Pt = readonly [number, number];

/*
 * Building blocks shared by the civ wall styles (English, German, ...):
 * soft ground shadows, battered blocks, palisade planks, lines. The
 * ground shadows are stacked translucent strokes and a radial gradient
 * instead of the Hungarian walls' canvas blur filter, which is the slow
 * part of a wall piece's paint.
 */

/** Soft contact shadow along an arm: three stacked strokes, widest and faintest first. */
export function armShadow(p: IsoPainter, arm: Arm, half: number): void {
  const ctx = p.ctx;
  const a = p.p(arm.a[0], arm.a[1], 0);
  const b = p.p(arm.b[0], arm.b[1], 0);
  ctx.lineCap = 'butt';
  for (const [k, alpha] of [[2.9, 0.08], [2.3, 0.1], [1.7, 0.12]] as const) {
    ctx.strokeStyle = `rgba(14,20,10,${alpha})`;
    ctx.lineWidth = half * HW * k;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1] + 2);
    ctx.lineTo(b[0], b[1] + 2);
    ctx.stroke();
  }
}

/** Soft elliptical shadow under a post (radial gradient, no filter). */
export function padShadow(p: IsoPainter, half: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(0.5, 0.5, 0);
  const r = half * HW * 2.2;
  ctx.save();
  ctx.translate(x + 2, y + 2);
  ctx.scale(1, 0.5);
  const g = ctx.createRadialGradient(0, 0, r * 0.35, 0, 0, r);
  g.addColorStop(0, 'rgba(14,20,10,0.4)');
  g.addColorStop(1, 'rgba(14,20,10,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export interface FrustumStyle extends WallStyle {
  readonly top?: number;
  /** Face-local painting on each of the two visible faces (x along the foot, y up as negative values). */
  readonly face?: (width: number, height: number, light: number, side: 'left' | 'right') => void;
}

/**
 * An axis-aligned block whose top is `inset` tiles in from its foot on
 * every side (a battered tower base, an earth mound, a bastion's
 * sloping scarp): the two visible faces as trapezoids with tilted
 * normals, the top, shadow volume points at the top corners.
 */
export function frustum(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, z0: number, z1: number, inset: number, style: FrustumStyle): void {
  const i = inset;
  const left: Pt[] = [p.p(u0, v1, z0), p.p(u1, v1, z0), p.p(u1 - i, v1 - i, z1), p.p(u0 + i, v1 - i, z1)];
  const right: Pt[] = [p.p(u1, v1, z0), p.p(u1, v0, z0), p.p(u1 - i, v0 + i, z1), p.p(u1 - i, v1 - i, z1)];
  const top: Pt[] = [p.p(u0 + i, v0 + i, z1), p.p(u1 - i, v0 + i, z1), p.p(u1 - i, v1 - i, z1), p.p(u0 + i, v1 - i, z1)];
  const run = i * HW * Math.SQRT2;
  const rise = (z1 - z0) / SCREEN_PER_WORLD_HEIGHT;
  const lit = i > 0 ? 0.05 : 0;
  for (const [pts, light, du, dv, side, upright] of [
    [right, baked(0.72 + lit), 1, 0, 'right', N_RIGHT],
    [left, baked(1.0 + lit), 0, 1, 'left', N_LEFT],
  ] as const) {
    const ys = pts.map((q) => q[1]);
    const g = p.ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
    g.addColorStop(0, css(shade(style.color, light * 1.06)));
    g.addColorStop(0.75, css(shade(style.color, light * 0.96)));
    g.addColorStop(1, css(shade(style.color, light * baked(0.7))));
    p.fillPoly(pts, g);
    p.normals.fill(pts, i > 0 ? slopeNormal(du, dv, run, rise) : upright);
    onFace(p, pts, z1 - z0, (w, h) => {
      if (style.detail) paintWallDetail(p.ctx, () => p.random(), style, w, h, light);
      style.face?.(w, h, light, side);
    });
    p.strokePoly(pts, css(shade(style.color, 0.4), 0.5), 1.1);
  }
  p.fillPoly(top, css(shade(style.top ?? style.color, 1.1)));
  p.normals.fill(top, N_UP);
  for (const [u, v] of [[u0 + i, v0 + i], [u1 - i, v0 + i], [u1 - i, v1 - i], [u0 + i, v1 - i]] as const) p.addVolumePoint(u, v, z1);
}

/**
 * One split-oak plank of a palisade standing at ground point c: a flat
 * two-tone board with a pointed head (no gradient), cylinder normal.
 */
export function plank(p: IsoPainter, c: UV, z0: number, height: number, color: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(c[0], c[1], z0);
  const r = 3.6;
  const h = height * (0.94 + p.random() * 0.1);
  const head = 5 + p.random() * 2;
  ctx.fillStyle = css(shade(color, 0.72));
  ctx.beginPath();
  ctx.moveTo(x - r, y + 1);
  ctx.lineTo(x - r, y - h);
  ctx.lineTo(x, y - h - head);
  ctx.lineTo(x + r, y - h);
  ctx.lineTo(x + r, y + 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = css(shade(color, 1.08));
  ctx.beginPath();
  ctx.moveTo(x - r, y + 1);
  ctx.lineTo(x - r, y - h);
  ctx.lineTo(x, y - h - head);
  ctx.lineTo(x - 0.2, y + 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(30,20,12,.55)';
  ctx.fillRect(x - 0.5, y - h - head + 2, 1, h + head - 1);
  p.normalCylinder(x - r, y - h - head, r * 2, h + head + 1);
}

/** A straight line between two art points. */
export function line(p: IsoPainter, a: Pt, b: Pt, color: string, width: number): void {
  p.ctx.strokeStyle = color;
  p.ctx.lineWidth = width;
  p.ctx.beginPath();
  p.ctx.moveTo(a[0], a[1]);
  p.ctx.lineTo(b[0], b[1]);
  p.ctx.stroke();
}
