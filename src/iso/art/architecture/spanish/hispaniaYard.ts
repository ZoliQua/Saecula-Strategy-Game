import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import type { ArchStyle } from '../style';
import { copingOf, kitsOf, wallOf } from './courtyardKits';
import { portal } from './hispaniaOrnament';
import { dress } from './hispaniaParts';

/*
 * Yards of the courtyard families' workplaces: the coped yard walls
 * (tapias) along the two front edges, a gateway in the front wall —
 * granite, alfiz or plateresque — and team banners on its piers.
 */

/** Small stepped merlons along a wall top from (u0, v0) to (u1, v1). */
function wallMerlons(p: IsoPainter, s: ArchStyle, u0: number, v0: number, u1: number, v1: number, z: number): void {
  const len = Math.hypot(u1 - u0, v1 - v0);
  const n = Math.max(1, Math.floor(len / 0.2));
  const wall = { color: wallOf(s).color };
  const cap = copingOf(s);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.3) / n;
    const u = u0 + (u1 - u0) * t;
    const v = v0 + (v1 - v0) * t;
    p.box(u - 0.035, v - 0.035, u + 0.035, v + 0.035, z, z + 6, wall, cap);
  }
}

/**
 * Yard walls on the two front edges of u0..u1 × v0..v1 (v = v1 and
 * u = u1), `h` px high; the front one leaves a gap from g0 to g1 (u)
 * for the gateway.
 */
export function yardWalls(p: IsoPainter, s: ArchStyle, u0: number, v0: number, u1: number, v1: number, h: number, g0: number, g1: number): void {
  const wall = wallOf(s);
  const cap = copingOf(s);
  const t = 0.06;
  p.box(u1 - t, v0, u1, v1, 0, h, wall, cap);
  p.rightFace(v0, v1, u1, 0, (w, hh) => dress(p.ctx, s, w, hh, R, false), h);
  if (kitsOf(s).merlons) wallMerlons(p, s, u1 - t / 2, v0, u1 - t / 2, v1 - t, h);
  for (const [a, b] of [[u0, g0], [g1, u1]] as const) {
    if (b - a < 0.02) continue;
    p.box(a, v1 - t, b, v1, 0, h, wall, cap);
    p.leftFace(a, b, v1, 0, (w, hh) => dress(p.ctx, s, w, hh, 1, false), h);
    if (kitsOf(s).merlons) wallMerlons(p, s, a, v1 - t / 2, b, v1 - t / 2, h);
  }
}

/**
 * Gateway standing in the front wall line v from g0 to g1: a gate block
 * with the age's portal (leaves in the owner's colour) and team banners
 * on its face, crenellated in the Mudéjar age.
 */
export function gateway(p: IsoPainter, s: ArchStyle, g0: number, g1: number, v: number, h: number, team: number): void {
  const wall = wallOf(s);
  const t = 0.08;
  p.box(g0, v - t, g1, v, 0, h, wall, copingOf(s));
  p.leftFace(g0, g1, v, 0, (w, hh) => {
    dress(p.ctx, s, w, hh, 1, false);
    portal(p, s, w / 2 - 9, 18, hh - 10, team, 1);
    const ctx = p.ctx;
    for (const bx of [3, w - 9]) {
      ctx.fillStyle = css(team);
      ctx.fillRect(bx, -hh + 3, 6, 13);
      ctx.fillStyle = css(shade(team, 0.6));
      ctx.fillRect(bx, -hh + 15, 6, 1.5);
    }
  }, h);
  p.rightFace(v - t, v, g1, 0, (w, hh) => dress(p.ctx, s, w, hh, R, false), h);
  if (kitsOf(s).merlons) wallMerlons(p, s, g0, v - t / 2, g1, v - t / 2, h);
  p.addVolumePoint((g0 + g1) / 2, v, h);
}

/** Round threshing floor (era) of stone setts with a heap of grain at (u, v). */
export function threshingFloor(p: IsoPainter, u: number, v: number, r: number): void {
  const ctx = p.ctx;
  const ring = (rr: number, color: string) => {
    const pts = Array.from({ length: 24 }, (_, k) => p.p(u + rr * Math.cos((k / 24) * Math.PI * 2), v + rr * Math.sin((k / 24) * Math.PI * 2), 0));
    p.fillPoly(pts, color);
  };
  ring(r, '#8e8576');
  ring(r * 0.9, '#c8b993');
  ctx.strokeStyle = 'rgba(110,96,70,.5)';
  ctx.lineWidth = 0.8;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const [x0, y0] = p.p(u, v, 0);
    const [x1, y1] = p.p(u + r * 0.9 * Math.cos(a), v + r * 0.9 * Math.sin(a), 0);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  const [x, y] = p.p(u + 0.05, v - 0.05, 0);
  ctx.fillStyle = '#e2c56a';
  ctx.beginPath();
  ctx.ellipse(x, y - 3, 10, 5, 0, Math.PI, 0);
  ctx.fill();
  p.addVolumePoint(u, v, 6);
}

/**
 * Noria: a timber water wheel standing in the u–z plane at (u, v),
 * radius r px, with spokes and a ring of clay pots, its axle on a brick
 * pier and the acequia running off along v.
 */
export function noria(p: IsoPainter, s: ArchStyle, u: number, v: number, r: number): void {
  const ctx = p.ctx;
  p.ground(u - 0.45, v - 0.06, u + 0.45, v + 0.06, 0x3c6f86);
  p.box(u + 0.28, v - 0.1, u + 0.42, v + 0.1, 0, r + 4, { color: s.palette.brick, detail: 'brick' }, shade(s.palette.brick, 1.1));
  p.leftFace(u - 0.4, u + 0.4, v, 0, (w) => {
    const cx = w / 2;
    const cy = -r - 2;
    ctx.strokeStyle = '#5c4129';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.fillStyle = '#b5603a';
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ctx.fillRect(cx + Math.cos(a) * r - 1.8, cy + Math.sin(a) * r - 1.5, 3.6, 3);
    }
    ctx.fillStyle = '#3a2a1c';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }, r * 2 + 6);
  p.normalCylinder(...p.p(u - 0.1, v, r * 2), 8, r * 2);
  p.addVolumePoint(u, v, r * 2 + 4);
}

/** Rows of bush vines on stakes over u0..u1 × v0..v1. */
export function vineyard(p: IsoPainter, u0: number, v0: number, u1: number, v1: number): void {
  const ctx = p.ctx;
  p.ground(u0, v0, u1, v1, 0x9a6a42);
  for (let v = v0 + 0.12; v < v1 - 0.05; v += 0.2) {
    for (let u = u0 + 0.1; u < u1 - 0.05; u += 0.16) {
      const [x, y] = p.p(u, v, 0);
      ctx.fillStyle = '#4d3424';
      ctx.fillRect(x - 0.6, y - 8, 1.2, 8);
      ctx.fillStyle = (Math.round(u * 37 + v * 11) % 3) ? '#4f7a2e' : '#62903a';
      ctx.beginPath();
      ctx.ellipse(x, y - 8, 5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a2a52';
      ctx.fillRect(x + 1, y - 7, 1.6, 1.6);
    }
  }
}

/** Irrigated huerta beds: dark green rows between channels on u0..u1 × v0..v1. */
export function huerta(p: IsoPainter, u0: number, v0: number, u1: number, v1: number): void {
  p.ground(u0, v0, u1, v1, 0x7a5434);
  for (let v = v0 + 0.05, i = 0; v < v1 - 0.08; v += 0.14, i++) {
    p.ground(u0 + 0.05, v, u1 - 0.05, v + 0.08, i % 3 === 2 ? 0x4b7cb0 : i % 2 ? 0x4f8a35 : 0x6f9a3d);
  }
}
