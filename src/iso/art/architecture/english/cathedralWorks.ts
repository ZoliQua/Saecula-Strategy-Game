import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { scaffold } from '../wonderParts';

/*
 * The cathedral works (the English Wonder's construction stages):
 * hollow wall heads, stepped unfinished courses, bare roof trusses, the
 * masons' lodge and dressed stone waiting in the close.
 */

export type Block = readonly [u0: number, v0: number, u1: number, v1: number];

/** Wall head of a hollow shell at z: the stone rim and the shadowed inside seen from above. */
export function shellTop(p: IsoPainter, [u0, v0, u1, v1]: Block, z: number, stone: number): void {
  p.fillPoly([p.p(u0, v0, z), p.p(u1, v0, z), p.p(u1, v1, z), p.p(u0, v1, z)], css(shade(stone, 1.1)));
  const t = 0.07;
  const inner = [p.p(u0 + t, v0 + t, z), p.p(u1 - t, v0 + t, z), p.p(u1 - t, v1 - t, z), p.p(u0 + t, v1 - t, z)];
  const ys = inner.map((q) => q[1]);
  const g = p.ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
  g.addColorStop(0, css(shade(stone, 0.2)));
  g.addColorStop(1, css(shade(stone, 0.42)));
  p.fillPoly(inner, g);
}

/**
 * Unfinished courses stepping up along the two near wall heads of a
 * block from z0 towards z1 (the back of each run highest), as masons
 * leave a wall between seasons.
 */
export function raggedCourses(p: IsoPainter, [u0, v0, u1, v1]: Block, z0: number, z1: number, stone: number): void {
  const t = 0.07;
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const z = z0 + ((z1 - z0) * (steps - i)) / (steps + 1);
    const a = u0 + ((u1 - u0) * i) / steps;
    p.box(a, v1 - t, a + (u1 - u0) / steps, v1, z0, z, { color: stone, detail: 'stone' }, shade(stone, 1.1));
  }
  for (let i = steps - 1; i >= 0; i--) {
    const z = z0 + ((z1 - z0) * (i + 1)) / (steps + 1);
    const b = v0 + ((v1 - v0) * i) / steps;
    p.box(u1 - t, b, u1, b + (v1 - v0) / steps, z0, z, { color: stone, detail: 'stone' }, shade(stone, 1.1));
  }
}

/** Bare timber roof trusses over a block, ridge along v (the roof framed before it is leaded). */
export function trusses(p: IsoPainter, [u0, v0, u1, v1]: Block, eave: number, rise: number): void {
  const ctx = p.ctx;
  const um = (u0 + u1) / 2;
  ctx.strokeStyle = '#8a6238';
  ctx.lineWidth = 2;
  for (let v = v0 + 0.08; v <= v1; v += 0.26) {
    const a = p.p(u0, v, eave);
    const m = p.p(um, v, eave + rise);
    const b = p.p(u1, v, eave);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(m[0], m[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.moveTo((a[0] + m[0]) / 2, (a[1] + m[1]) / 2);
    ctx.lineTo((b[0] + m[0]) / 2, (b[1] + m[1]) / 2);
    ctx.stroke();
  }
  const r0 = p.p(um, v0, eave + rise);
  const r1 = p.p(um, v1, eave + rise);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(r0[0], r0[1]);
  ctx.lineTo(r1[0], r1[1]);
  ctx.stroke();
  p.addVolumePoint(um, v0, eave + rise);
  p.addVolumePoint(um, v1, eave + rise);
}

/** Masons' lodge: a timber lean-to under thatch with a banker bench and stone in front. */
export function lodge(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, timber: number, thatch: number): void {
  p.box(u0, v0, u1, v1, 0, 24, { color: timber, detail: 'planks' });
  p.leftFace(u0, u1, v1, 0, (w) => {
    p.ctx.fillStyle = '#17110c';
    p.ctx.fillRect(w * 0.25, -20, w * 0.5, 20);
  }, 24);
  const prev = p.material;
  p.material = 'thatch';
  p.gableRoof(u0, v0, u1, v1, 24, 22, thatch, timber, 'u', 0.08);
  p.material = prev;
  p.box(u0 + 0.1, v1 + 0.12, u1 - 0.1, v1 + 0.24, 0, 9, { color: timber }, shade(timber, 1.1));
  p.box(u0 + 0.2, v1 + 0.14, u0 + 0.38, v1 + 0.26, 9, 15, { color: 0xddd2bb }, 0xece4d2);
}

/** Dressed blocks stacked in the close. */
export function stonePile(p: IsoPainter, u: number, v: number, stone: number): void {
  for (const [du, dv, z] of [[0, 0, 0], [0.2, 0.02, 0], [0.05, 0.2, 0], [0.22, 0.22, 0], [0.1, 0.08, 10]] as const) {
    p.box(u + du, v + dv, u + du + 0.18, v + dv + 0.15, z, z + 10, { color: stone }, shade(stone, 1.12));
  }
}

/** Scaffold wrapped round a square block between z0 and z1 (re-export for the stage layouts). */
export function scaffoldAround(p: IsoPainter, [u0, v0, u1, v1]: Block, z0: number, z1: number): void {
  scaffold(p, u0, v0, u1, v1, z0, z1);
}

/** Earth churned by the works over a footprint. */
export function churned(p: IsoPainter, u0: number, v0: number, u1: number, v1: number): void {
  p.ground(u0, v0, u1, v1, 0x7a6448);
  const ctx = p.ctx;
  for (let i = 0; i < 80; i++) {
    const [x, y] = p.p(u0 + p.random() * (u1 - u0), v0 + p.random() * (v1 - v0), 0);
    ctx.fillStyle = css(shade(0x7a6448, 0.7 + p.random() * 0.5), 0.8);
    ctx.fillRect(x, y, 3 + p.random() * 3, 1.5);
  }
}
