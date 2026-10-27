import { ellipse, type Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { post } from '../parts';
import type { ArchStyle } from '../style';

/*
 * English props and fixtures: Tudor brick chimney stacks, hanging
 * banners and the Roman vexillum (team colour), hedgerows, drystone
 * walls, spoil heaps, cruck frames and archery butts. Each records its
 * lighting data (normals through boxes, volume, smoke) on the painter.
 */

/**
 * Tudor brick chimney stack: a brick base from z0, a corbelled band and
 * `shafts` separate flues with diagonal brick patterns, capped; records
 * the smoke anchor. Domestic stacks follow the chimneys ornament; forge
 * stacks always stand.
 */
export function brickStack(
  p: IsoPainter,
  s: ArchStyle,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  z0: number,
  z1: number,
  shafts = 2,
  kind: 'domestic' | 'forge' = 'domestic',
): void {
  if (kind === 'domestic' && !s.ornaments.chimneys) return;
  const brick = s.palette.stack;
  const zc = z1 - 18;
  p.box(u0, v0, u1, v1, z0, zc, { color: brick, detail: 'brick' }, shade(brick, 0.9));
  p.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, zc, zc + 3.5, { color: shade(brick, 0.82) }, shade(brick, 0.95));
  const alongU = u1 - u0 >= v1 - v0;
  const len = alongU ? u1 - u0 : v1 - v0;
  const side = Math.min(0.1, (len / shafts) * 0.8);
  for (let i = 0; i < shafts; i++) {
    const t = (len / shafts) * (i + 0.5);
    const cu = alongU ? u0 + t : (u0 + u1) / 2;
    const cv = alongU ? (v0 + v1) / 2 : v0 + t;
    const [a0, b0, a1, b1] = [cu - side / 2, cv - side / 2, cu + side / 2, cv + side / 2];
    p.box(a0, b0, a1, b1, zc + 3.5, z1, { color: brick }, brick);
    const twist = (light: number) => (w: number, h: number) => {
      p.ctx.strokeStyle = css(shade(brick, light * 0.62), 0.8);
      p.ctx.lineWidth = 1;
      p.ctx.beginPath();
      for (let y = -2; y > -h - w; y -= 3.5) {
        p.ctx.moveTo(0, y);
        p.ctx.lineTo(w, y - w * 0.7);
      }
      p.ctx.stroke();
    };
    p.leftFace(a0, a1, b1, zc + 3.5, twist(1), z1 - zc - 3.5);
    p.rightFace(b0, b1, a1, zc + 3.5, twist(0.72), z1 - zc - 3.5);
    p.box(a0 - 0.02, b0 - 0.02, a1 + 0.02, b1 + 0.02, z1 - 2.5, z1 + 1.5, { color: shade(brick, 0.78) }, 0x241c18);
  }
  p.addSmoke((u0 + u1) / 2, (v0 + v1) / 2, z1 + 2);
}

/** Team-coloured banner hanging from a rod on a face (face-local), with a white St George cross and gold fringe. */
export function hangingBanner(ctx: Ctx, x: number, y: number, w: number, h: number, team: number, light = 1): void {
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
  ctx.fillStyle = css(shade(0xf3eee2, light), 0.9);
  ctx.fillRect(x + w / 2 - w * 0.11, y + 2, w * 0.22, h - w * 0.5);
  ctx.fillRect(x + 1.5, y + h * 0.3, w - 3, w * 0.2);
  ctx.fillStyle = css(shade(0xd9b14a, light));
  ctx.fillRect(x, y, w, 1.6);
}

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
