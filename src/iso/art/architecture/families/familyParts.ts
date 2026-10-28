import { ellipse, type Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { CHARGES, type CrestCharge } from '../charges';

/*
 * Props of the shared families (Tudor, Georgian) and the English sets:
 * team banners, hedgerows, spoil heaps, archery butts and training
 * dummies. Each records its lighting data (normals through boxes,
 * volume, smoke) on the painter.
 */

/**
 * Team-coloured banner hanging from a rod on a face (face-local) with a
 * gold fringe, bearing a white St George cross or another style's charge.
 */
export function hangingBanner(ctx: Ctx, x: number, y: number, w: number, h: number, team: number, light = 1, charge: CrestCharge = 'st_george'): void {
  ctx.fillStyle = css(shade(0x2a221c, light));
  ctx.fillRect(x - 2, y - 2, w + 4, 2.4);
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, css(shade(team, light * 1.12)));
  g.addColorStop(1, css(shade(team, light * 0.72)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w / 2, y + h - w * 0.45);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  if (charge === 'st_george') {
    ctx.fillStyle = css(shade(0xf3eee2, light), 0.9);
    ctx.fillRect(x + w / 2 - w * 0.11, y + 2, w * 0.22, h - w * 0.5);
    ctx.fillRect(x + 1.5, y + h * 0.3, w - 3, w * 0.2);
  } else CHARGES[charge](ctx, x + w / 2, y + h * 0.4, w * 0.42);
  ctx.fillStyle = css(shade(0xd9b14a, light));
  ctx.fillRect(x, y, w, 1.6);
}

/** Hedgerow: a clipped bushy band along an axis-aligned line, painted as overlapping leaf clumps. */
export function hedge(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, h: number, color = 0x3f6a2e): void {
  const ctx = p.ctx;
  const len = Math.hypot(u1 - u0, v1 - v0);
  const n = Math.max(3, Math.round(len / 0.07));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [x, y] = p.p(u0 + (u1 - u0) * t, v0 + (v1 - v0) * t, 0);
    const r = 5 + p.random() * 2.5;
    const top = y - h + p.random() * 3;
    const g = ctx.createLinearGradient(x - r, top, x + r, y);
    g.addColorStop(0, css(shade(color, 1.35)));
    g.addColorStop(0.6, css(shade(color, 0.95)));
    g.addColorStop(1, css(shade(color, 0.6)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.lineTo(x - r, top + r * 0.6);
    ctx.quadraticCurveTo(x, top - r * 0.5, x + r, top + r * 0.6);
    ctx.lineTo(x + r, y);
    ctx.closePath();
    ctx.fill();
    p.normalCylinder(x - r, top - r * 0.5, r * 2, y - top + r * 0.5);
    if (i % 3 === 0) {
      ellipse(ctx, x + (p.random() - 0.5) * 6, top + 3, 1.6, 1.4);
      ctx.fillStyle = i % 2 ? '#f2efe2' : '#b23a2e';
      ctx.fill();
    }
  }
  for (const [u, v] of [[u0, v0], [u1, v1]] as const) p.addVolumePoint(u, v, h);
}

/** Heap of mine spoil (grey rubble cone with loose stones). */
export function spoilHeap(p: IsoPainter, u: number, v: number, r: number, h: number, color: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  const g = ctx.createLinearGradient(x - r, y - h, x + r, y);
  g.addColorStop(0, css(shade(color, 1.25)));
  g.addColorStop(1, css(shade(color, 0.55)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.quadraticCurveTo(x - r * 0.4, y - h * 1.05, x, y - h);
  ctx.quadraticCurveTo(x + r * 0.45, y - h * 1.05, x + r, y);
  ctx.quadraticCurveTo(x, y + r * 0.3, x - r, y);
  ctx.fill();
  p.normalCylinder(x - r, y - h, r * 2, h);
  for (let k = 0; k < r * 1.6; k++) {
    const sx = x + (p.random() - 0.5) * r * 1.6;
    const sy = y - p.random() * h * (1 - Math.abs(sx - x) / r) * 0.9;
    ellipse(ctx, sx, sy, 2 + p.random() * 1.6, 1.4 + p.random());
    ctx.fillStyle = css(shade(color, 0.7 + p.random() * 0.6));
    ctx.fill();
  }
  p.addVolumePoint(u, v, h);
}

/** Archery butt: a turf mound with a painted target on its face. */
export function earthButt(p: IsoPainter, u: number, v: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  const g = ctx.createLinearGradient(x - 18, y - 24, x + 18, y);
  g.addColorStop(0, '#7fa04e');
  g.addColorStop(0.55, '#5d7f37');
  g.addColorStop(1, '#3d5426');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 20, y + 2);
  ctx.lineTo(x - 13, y - 22);
  ctx.quadraticCurveTo(x, y - 27, x + 13, y - 22);
  ctx.lineTo(x + 20, y + 2);
  ctx.quadraticCurveTo(x, y + 8, x - 20, y + 2);
  ctx.fill();
  p.normalCylinder(x - 20, y - 26, 40, 28);
  ctx.strokeStyle = 'rgba(40,52,22,.55)';
  ctx.lineWidth = 0.8;
  for (let k = 1; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(x - 20 + k * 2, y + 2 - k * 6);
    ctx.lineTo(x + 20 - k * 2, y + 2 - k * 6);
    ctx.stroke();
  }
  for (const [r, c] of [[7.5, '#f2ead6'], [5.5, '#2b2b2b'], [3.8, '#3d6fc0'], [2.2, '#c0392b'], [1, '#e8c35a']] as const) {
    ellipse(ctx, x - 3, y - 12, r * 0.8, r);
    ctx.fillStyle = c;
    ctx.fill();
  }
  p.addVolumePoint(u, v, 24);
}

/** Training dummy: a straw head on a cross-post. */
export function dummy(p: IsoPainter, u: number, v: number, wood = 0x4a3624): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  ctx.fillStyle = css(wood);
  ctx.fillRect(x - 1.5, y - 26, 3, 26);
  ctx.fillRect(x - 9, y - 20, 18, 3);
  ellipse(ctx, x, y - 29, 4.5, 4.5);
  ctx.fillStyle = '#b9a06a';
  ctx.fill();
  p.normals.cylinderStroke([[[x, y], [x, y - 26]], [[x - 9, y - 18.5], [x + 9, y - 18.5]]], 3, x - 9, 18);
  p.normals.cylinderPoly([[x - 4.5, y - 29], [x, y - 33.5], [x + 4.5, y - 29], [x, y - 24.5]], x - 4.5, 9);
}
