import { ellipse } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';

type Pt = readonly [number, number];

/*
 * Georgian yard and field pieces: wheat and turnip rows of the Norfolk
 * rotation, a five-bar gate, a mown lawn with stripes, tripod archery
 * targets, a twin-sheave headframe and a timber drug (log carriage).
 * Normals for thin timbers are stroked along the timbers only.
 */

function line(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, color: string, width: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
}

/** Ripe wheat in drilled rows along u (Jethro Tull's seed drill). */
export function wheatRows(p: IsoPainter, u0: number, v0: number, u1: number, v1: number): void {
  const ctx = p.ctx;
  for (let v = v0 + 0.05; v < v1; v += 0.11) {
    for (let u = u0 + 0.03; u < u1; u += 0.055) {
      const [x, y] = p.p(u, v, 0);
      const h = 8 + p.random() * 3;
      ctx.strokeStyle = p.random() > 0.3 ? '#d9b452' : '#b8923c';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 1.5, y - h);
      ctx.stroke();
      ctx.fillStyle = '#ecd47e';
      ctx.fillRect(x + 0.8, y - h - 2.5, 1.4, 3);
    }
  }
}

/** Turnips in rows: round leafy clumps with a purple-white shoulder showing. */
export function turnipRows(p: IsoPainter, u0: number, v0: number, u1: number, v1: number): void {
  const ctx = p.ctx;
  for (let u = u0 + 0.06; u < u1; u += 0.14) {
    for (let v = v0 + 0.05; v < v1; v += 0.09) {
      const [x, y] = p.p(u, v, 0);
      ellipse(ctx, x, y - 1, 2.6, 1.6);
      ctx.fillStyle = '#c9a6c4';
      ctx.fill();
      for (const [dx, dy, c] of [[-2.2, -3, '#3f6e2a'], [2, -3.4, '#4f8432'], [0, -5, '#5f9a3a']] as const) {
        ellipse(ctx, x + dx, y + dy, 2.8, 2.2);
        ctx.fillStyle = c;
        ctx.fill();
      }
    }
  }
}

/** White five-bar field gate with a diagonal brace between (u0, v0) and (u1, v1). */
export function fiveBarGate(p: IsoPainter, u0: number, v0: number, u1: number, v1: number): void {
  const ctx = p.ctx;
  const h = 12;
  for (const [u, v] of [[u0, v0], [u1, v1]] as const) {
    const [x, y] = p.p(u, v, 0);
    ctx.fillStyle = '#5a4632';
    ctx.fillRect(x - 1.5, y - h - 3, 3, h + 3);
  }
  for (let k = 0; k < 5; k++) {
    const z = 2 + (k * (h - 2)) / 4;
    line(ctx, p.p(u0, v0, z), p.p(u1, v1, z), '#ece6d6', 1.3);
  }
  line(ctx, p.p(u0, v0, 2), p.p(u1, v1, h), '#ece6d6', 1.3);
  p.addVolumePoint(u0, v0, h);
  p.addVolumePoint(u1, v1, h);
}

/** Close-mown lawn with alternating light and dark roller stripes along u. */
export function lawn(p: IsoPainter, u0: number, v0: number, u1: number, v1: number): void {
  p.ground(u0, v0, u1, v1, 0x6f8f45);
  const band = (v1 - v0) / 10;
  for (let i = 0; i < 10; i += 2) {
    const pts = [p.p(u0, v0 + i * band, 0), p.p(u1, v0 + i * band, 0), p.p(u1, v0 + (i + 1) * band, 0), p.p(u0, v0 + (i + 1) * band, 0)];
    p.fillPoly(pts, 'rgba(150,190,95,.35)');
  }
}

/** Straw boss with the five-colour target face on a timber tripod. */
export function tripodTarget(p: IsoPainter, u: number, v: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  const top: Pt = [x, y - 30];
  const legs: Pt[][] = [[[x - 9, y + 1], top], [[x + 8, y], top], [[x + 2, y - 6], top]];
  for (const [a, b] of legs) line(ctx, a!, b!, '#5e3f22', 1.8);
  ellipse(ctx, x, y - 22, 11.5, 12.5);
  ctx.fillStyle = '#c9a457';
  ctx.fill();
  for (const [r, c] of [[10, '#f2ead6'], [8, '#1e1e22'], [6, '#3a6fc4'], [4, '#c43a2e'], [2, '#e8c23a']] as const) {
    ellipse(ctx, x, y - 22, r * 0.92, r);
    ctx.fillStyle = c;
    ctx.fill();
  }
  p.normals.cylinderStroke(legs, 2.6, x - 10, 20);
  p.addVolumePoint(u, v, 34);
}

/**
 * Timber headframe over a shaft at (u, v): two raking legs and a back
 * stay meeting under a pair of spoked sheave wheels at height h.
 */
export function sheaveFrame(p: IsoPainter, u: number, v: number, h: number, timber: number): void {
  const ctx = p.ctx;
  const [sx, sy] = p.p(u, v, 0);
  ellipse(ctx, sx, sy, 14, 7);
  ctx.fillStyle = '#4a443c';
  ctx.fill();
  ellipse(ctx, sx, sy, 9, 4.5);
  ctx.fillStyle = '#0d0a08';
  ctx.fill();
  const head = p.p(u, v, h);
  const legs: Pt[][] = [
    [p.p(u - 0.22, v + 0.2, 0), head],
    [p.p(u + 0.22, v - 0.2, 0), head],
    [p.p(u + 0.32, v + 0.25, 0), head],
  ];
  for (const [a, b] of legs) line(ctx, a!, b!, css(timber), 3.2);
  line(ctx, p.p(u - 0.11, v + 0.1, h / 2), p.p(u + 0.11, v - 0.1, h / 2), css(timber), 2);
  const wheels: Pt[][] = [];
  for (const dx of [-5, 5]) {
    const cx = head[0] + dx;
    const cy = head[1] - 6;
    ctx.strokeStyle = '#26221e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 4.5, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 0.8;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(a) * 4.5, cy - Math.sin(a) * 9);
      ctx.lineTo(cx + Math.cos(a) * 4.5, cy + Math.sin(a) * 9);
      ctx.stroke();
    }
    const rim: Pt[] = [];
    for (let k = 0; k <= 16; k++) rim.push([cx + Math.cos((k / 16) * Math.PI * 2) * 4.5, cy + Math.sin((k / 16) * Math.PI * 2) * 9]);
    wheels.push(rim);
  }
  ctx.strokeStyle = '#c9b08a';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(head[0] + 9.5, head[1] - 6);
  ctx.lineTo(sx + 9, sy - 2);
  ctx.stroke();
  p.normals.cylinderStroke([...legs, ...wheels], 3.4, head[0] - 14, 28);
  p.addVolumePoint(u, v, h + 15);
}

/** Timber drug: a pair of tall cart wheels on an axle with a trunk slung beneath, shafts on the ground. */
export function timberDrug(p: IsoPainter, u: number, v: number, timber: number): void {
  const ctx = p.ctx;
  const t0 = p.p(u - 0.35, v + 0.05, 5);
  const t1 = p.p(u + 0.35, v + 0.05, 5);
  ctx.lineCap = 'round';
  line(ctx, t0, t1, '#6b4426', 8);
  line(ctx, [t0[0], t0[1] - 2], [t1[0], t1[1] - 2], '#8a5a32', 3);
  ctx.lineCap = 'butt';
  ellipse(ctx, t1[0] + 1, t1[1], 3.4, 4);
  ctx.fillStyle = '#e0b880';
  ctx.fill();
  line(ctx, p.p(u, v, 14), p.p(u + 0.45, v + 0.35, 2), css(timber), 2);
  const wheels: Pt[][] = [];
  for (const dv of [-0.12, 0.2]) {
    const [cx, cy] = p.p(u, v + dv, 14);
    ctx.strokeStyle = css(shade(timber, 0.8));
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 8, 14, 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(a) * 7, cy - Math.sin(a) * 12.5);
      ctx.lineTo(cx + Math.cos(a) * 7, cy + Math.sin(a) * 12.5);
      ctx.stroke();
    }
    const rim: Pt[] = [];
    for (let k = 0; k <= 20; k++) {
      const a = (k / 20) * Math.PI * 2;
      const ex = Math.cos(a) * 8;
      const ey = Math.sin(a) * 14;
      rim.push([cx + ex * Math.cos(0.4) - ey * Math.sin(0.4), cy + ex * Math.sin(0.4) + ey * Math.cos(0.4)]);
    }
    wheels.push(rim);
  }
  p.normals.cylinderStroke([[t0, t1], ...wheels], 3, t0[0], t1[0] - t0[0]);
  p.addVolumePoint(u, v, 28);
}
