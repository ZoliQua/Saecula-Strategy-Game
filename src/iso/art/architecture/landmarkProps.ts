import type { IsoPainter } from '../isoPainter';
import { css, shade } from '../palette';

type Pt = readonly [number, number];

/*
 * Small props the nations' landmark painters share (M17): pointed stakes
 * standing on a wall top, a coil of rope, a stroked timber member, and a
 * spoked wheel standing in a vertical plane (crane treadwheels, carts).
 * Civ-free: each painter passes its palette colours.
 */

/** Line of sharpened stakes from (u0, v0) to (u1, v1) standing on height z (a palisade on a wall top). */
export function stakes(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, z: number, height: number, wood: number, step = 0.085): void {
  const ctx = p.ctx;
  const n = Math.max(1, Math.round(Math.hypot(u1 - u0, v1 - v0) / step));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [x, y] = p.p(u0 + (u1 - u0) * t, v0 + (v1 - v0) * t, z);
    const h = height * (0.88 + p.random() * 0.24);
    const r = 2.6;
    const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
    g.addColorStop(0, css(shade(wood, 1.25)));
    g.addColorStop(1, css(shade(wood, 0.65)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.lineTo(x - r, y - h);
    ctx.lineTo(x, y - h - 4.5);
    ctx.lineTo(x + r, y - h);
    ctx.lineTo(x + r, y);
    ctx.closePath();
    ctx.fill();
    p.normalCylinder(x - r, y - h - 4.5, r * 2, h + 4.5);
  }
  const a = p.p(u0, v0, z + height * 0.6);
  const b = p.p(u1, v1, z + height * 0.6);
  ctx.strokeStyle = css(shade(wood, 0.45), 0.85);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  for (const [u, v] of [[u0, v0], [u1, v1]] as const) p.addVolumePoint(u, v, z + height);
}

/** A flat coil of rope lying at ground point (u, v, z): stacked rings, `r` px across. */
export function ropeCoil(p: IsoPainter, u: number, v: number, z: number, r: number, rope = 0xc8b07a): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, z);
  const turns = 4;
  for (let k = 0; k < turns; k++) {
    const yy = y - k * 2.2;
    ctx.fillStyle = css(shade(rope, 0.55));
    ctx.beginPath();
    ctx.ellipse(x, yy + 0.8, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(shade(rope, 0.85 + k * 0.08));
    ctx.beginPath();
    ctx.ellipse(x, yy, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // The hole of the coil and the rope's lay.
  ctx.fillStyle = css(shade(rope, 0.4));
  ctx.beginPath();
  ctx.ellipse(x, y - (turns - 1) * 2.2, r * 0.42, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = css(shade(rope, 0.6), 0.7);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.ellipse(x, y - (turns - 1) * 2.2, r * 0.72, r * 0.36, 0, 0, Math.PI * 2);
  ctx.stroke();
  p.normalCylinder(x - r, y - turns * 2.2 - r * 0.5, r * 2, turns * 2.2 + r);
  p.addVolumePoint(u, v, z + turns * 2.2);
}

/** A straight timber (or rope) member between two world points, stroked with a lit edge. */
export function beam(p: IsoPainter, a: readonly [number, number, number], b: readonly [number, number, number], color: number, width: number): void {
  const ctx = p.ctx;
  const pa = p.p(...a);
  const pb = p.p(...b);
  ctx.lineCap = 'round';
  ctx.strokeStyle = css(shade(color, 0.6));
  ctx.lineWidth = width + 1.2;
  line(ctx, pa, pb);
  ctx.strokeStyle = css(color);
  ctx.lineWidth = width;
  line(ctx, pa, pb);
  if (width >= 2.5) {
    ctx.strokeStyle = css(shade(color, 1.35), 0.7);
    ctx.lineWidth = 1;
    line(ctx, [pa[0] - width * 0.3, pa[1]], [pb[0] - width * 0.3, pb[1]]);
  }
  ctx.lineCap = 'butt';
  p.normals.cylinderStroke([[pa, pb]], width + 1.2, Math.min(pa[0], pb[0]) - width, Math.abs(pb[0] - pa[0]) + width * 2);
  p.addVolumePoint(a[0], a[1], a[2]);
  p.addVolumePoint(b[0], b[1], b[2]);
}

function line(ctx: CanvasRenderingContext2D, a: Pt, b: Pt): void {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
}

/**
 * A spoked wheel standing in the vertical plane v = const (axis 'u', the
 * wheel faces +v) or u = const (axis 'v'): centre (u, v, z), radius `r`
 * tiles along its plane and `rz` art px up; rim of `rimWidth` px.
 */
export function wheel(p: IsoPainter, u: number, v: number, z: number, r: number, rz: number, axis: 'u' | 'v', color: number, spokes = 8, rimWidth = 3): void {
  const ctx = p.ctx;
  const at = (a: number, k = 1): Pt => (axis === 'u' ? p.p(u + Math.cos(a) * r * k, v, z + Math.sin(a) * rz * k) : p.p(u, v + Math.cos(a) * r * k, z + Math.sin(a) * rz * k));
  const ring = (k: number): Pt[] => [...Array(33).keys()].map((i) => at((i / 32) * Math.PI * 2, k));
  const c = at(0, 0);
  ctx.strokeStyle = css(shade(color, 0.85));
  ctx.lineWidth = 1.6;
  for (let i = 0; i < spokes; i++) line(ctx, c, at((i / spokes) * Math.PI * 2, 0.92));
  const outer = ring(1);
  ctx.strokeStyle = css(shade(color, 0.55));
  ctx.lineWidth = rimWidth + 1.4;
  ctx.beginPath();
  outer.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke();
  ctx.strokeStyle = css(shade(color, axis === 'u' ? 1.05 : 0.8));
  ctx.lineWidth = rimWidth;
  ctx.stroke();
  ctx.fillStyle = css(shade(color, 0.5));
  ctx.beginPath();
  ctx.arc(c[0], c[1], 2.6, 0, Math.PI * 2);
  ctx.fill();
  const xs = outer.map((q) => q[0]);
  const spokeLines = [...Array(spokes).keys()].map((i) => [c, at((i / spokes) * Math.PI * 2, 0.92)] as const);
  p.normals.cylinderStroke([outer, ...spokeLines], rimWidth + 1.4, Math.min(...xs), Math.max(...xs) - Math.min(...xs));
  p.addVolumePoint(u, v, z + rz);
}
