import { ellipse, type Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { post } from '../parts';

/*
 * English (Romano-British) props and fixtures: the Roman vexillum (team
 * colour), drystone walls, cruck frames and round wattle fences. Each
 * records its lighting data (normals through boxes, volume) on the
 * painter. The props the shared families use live in
 * families/familyParts.ts.
 */

/** Roman vexillum: a square team banner hung from a crossbar on a tall pole, gilded disc on top. */
export function vexillum(p: IsoPainter, u: number, v: number, pole: number, team: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  post(p, u, v, 0, pole, 1.3, 0x4a3624);
  ctx.fillStyle = '#3a2a1c';
  ctx.fillRect(x - 10, y - pole + 8, 20, 2);
  const g = ctx.createLinearGradient(x - 9, 0, x + 9, 0);
  g.addColorStop(0, css(shade(team, 1.15)));
  g.addColorStop(1, css(shade(team, 0.72)));
  ctx.fillStyle = g;
  ctx.fillRect(x - 9, y - pole + 10, 18, 17);
  ctx.fillStyle = '#e2bd52';
  for (let k = 0; k < 6; k++) ctx.fillRect(x - 9 + k * 3.3, y - pole + 27, 1.4, 3.5);
  ctx.fillRect(x - 9, y - pole + 10, 18, 1.4);
  ctx.beginPath();
  ctx.arc(x, y - pole - 1, 3.2, 0, Math.PI * 2);
  ctx.fill();
  p.addVolumePoint(u, v, pole);
}

/** Drystone field wall along an axis-aligned edge, with rounded coping stones. */
export function drystone(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, h: number, color: number): void {
  const t = 0.07;
  const alongU = v0 === v1;
  const U1 = alongU ? u1 : u0 + t;
  const V1 = alongU ? v0 + t : v1;
  p.box(u0, v0, U1, V1, 0, h, { color, detail: 'fieldstone' }, shade(color, 1.05));
  const ctx = p.ctx;
  const len = alongU ? u1 - u0 : v1 - v0;
  for (let k = 0; k < len / 0.045; k++) {
    const s = k * 0.045 + 0.02;
    const [x, y] = alongU ? p.p(u0 + s, v0 + t / 2, h) : p.p(u0 + t / 2, v0 + s, h);
    ellipse(ctx, x, y - 1, 2.6, 2.4);
    ctx.fillStyle = css(shade(color, 0.85 + p.random() * 0.35));
    ctx.fill();
  }
}

/** Cruck blade pair on an end wall below the eave (face-local): curved timbers rising from the corners. */
export function cruckWall(ctx: Ctx, w: number, h: number, color: number, light = 1): void {
  ctx.strokeStyle = css(shade(color, light));
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w * 0.08, 0);
  ctx.quadraticCurveTo(w * 0.1, -h * 0.7, w * 0.2, -h);
  ctx.moveTo(w * 0.92, 0);
  ctx.quadraticCurveTo(w * 0.9, -h * 0.7, w * 0.8, -h);
  ctx.stroke();
  ctx.fillStyle = css(shade(color, light));
  ctx.fillRect(0, -h, w, 3);
}

/** Cruck blades continuing up the gable to cross at the apex, with a collar (gable detail). */
export function cruckGable(ctx: Ctx, w: number, rise: number, color: number, light = 1): void {
  ctx.strokeStyle = css(shade(color, light));
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w * 0.2, 0);
  ctx.quadraticCurveTo(w * 0.32, -rise * 0.75, w * 0.56, -rise - 4);
  ctx.moveTo(w * 0.8, 0);
  ctx.quadraticCurveTo(w * 0.68, -rise * 0.75, w * 0.44, -rise - 4);
  ctx.stroke();
  ctx.fillStyle = css(shade(color, light));
  ctx.fillRect(w * 0.3, -rise * 0.5, w * 0.4, 3);
}

/**
 * Half of a round wattle-and-rail paddock fence centred on (uc, vc):
 * paint 'back' before whatever stands inside, then 'front'.
 */
export function roundFence(p: IsoPainter, uc: number, vc: number, r: number, h: number, half: 'back' | 'front', wood = 0x5a4632): void {
  const ctx = p.ctx;
  const front = half === 'front';
  const a0 = front ? -Math.PI / 4 : (3 * Math.PI) / 4;
  const n = Math.max(8, Math.round(r * 30));
  const at = (a: number, z: number) => p.p(uc + r * Math.cos(a), vc + r * Math.sin(a), z);
  for (const z of [h * 0.4, h * 0.85]) {
    ctx.strokeStyle = css(shade(wood, front ? 1.15 : 0.8));
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k <= n; k++) {
      const [x, y] = at(a0 + (k / n) * Math.PI, z);
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (let k = 0; k <= n; k += 2) {
    const [x, y] = at(a0 + (k / n) * Math.PI, 0);
    ctx.fillStyle = css(shade(wood, front ? 1 : 0.75));
    ctx.fillRect(x - 1.2, y - h - 2, 2.4, h + 2);
    p.normalCylinder(x - 1.2, y - h - 2, 2.4, h + 2);
  }
  if (front) for (const a of [0, Math.PI / 2]) p.addVolumePoint(uc + r * Math.cos(a), vc + r * Math.sin(a), h);
}
