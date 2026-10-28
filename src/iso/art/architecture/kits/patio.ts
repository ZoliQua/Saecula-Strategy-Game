import type { Ctx } from '../../canvas';
import { HH, HW, type IsoPainter } from '../../isoPainter';
import { css, mix, shade } from '../../palette';
import { helm } from '../roofs';

type Pt = readonly [number, number];

/*
 * Patio kit: the open courtyard of Mediterranean houses, cloisters and
 * palaces — its paving and the shade its walls cast, the arcades of its
 * galleries (face-local), and the garden in it: orange trees, cypresses,
 * pots, a well, a basin fountain, a long pool. Every prop records its
 * volume and normals through the painter; the arcade paints albedo over
 * a face that already carries its normal.
 */

export type ArchHead = 'round' | 'horseshoe' | 'lobed';

export interface ArcadeOpts {
  readonly bays: number;
  readonly head: ArchHead;
  /** Spandrel / wall colour (the face behind). */
  readonly wall: number;
  /** Shaft colour of the columns; piers when undefined. */
  readonly column?: number | undefined;
  /** Baked light of the face (1 = lit +v, R = +u). */
  readonly light: number;
  /** Rectangular frame (alfiz) round each arch in this colour. */
  readonly alfiz?: number | undefined;
  /** Height of the openings as a share of the face (default 0.82). */
  readonly rise?: number;
  /** Lattice (sebka) relief over the arches, as in Nasrid courts. */
  readonly lattice?: boolean;
}

/** Arch opening outline from (x, 0) to (x + w, 0), crown at -h. */
export function archPath(ctx: Ctx, x: number, w: number, h: number, head: ArchHead): void {
  const r = w / 2;
  const cx = x + r;
  ctx.beginPath();
  if (head === 'horseshoe') {
    const k = Math.min(r * 0.2, 2.6);
    const a = Math.asin((r - k) / r);
    const cy = -h + r;
    ctx.moveTo(x + k, 0);
    ctx.lineTo(x + k, cy + Math.cos(a) * r);
    ctx.arc(cx, cy, r, Math.PI / 2 + a, Math.PI / 2 - a);
    ctx.lineTo(x + w - k, 0);
  } else if (head === 'lobed') {
    // Polylobed (cusped) head: five small lobes on a round crown.
    const cy = -h + r;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, cy);
    const lobes = 5;
    for (let i = 0; i < lobes; i++) {
      const a0 = Math.PI + (i / lobes) * Math.PI;
      const a1 = Math.PI + ((i + 1) / lobes) * Math.PI;
      const am = (a0 + a1) / 2;
      const rr = r * 0.78;
      ctx.quadraticCurveTo(cx + Math.cos(am) * r * 1.02, cy + Math.sin(am) * r * 1.02, cx + Math.cos(a1) * (i === lobes - 1 ? r : rr), cy + Math.sin(a1) * (i === lobes - 1 ? r : rr));
    }
    ctx.lineTo(x + w, 0);
  } else {
    const cy = -h + r;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, cy);
    ctx.arc(cx, cy, r, Math.PI, 0);
    ctx.lineTo(x + w, 0);
  }
  ctx.closePath();
}

/**
 * Arcade along a face (face-local, call inside leftFace / rightFace):
 * dark gallery openings under round, horseshoe or cusped heads, with
 * slender columns (or piers) and capitals between them.
 */
export function arcade(ctx: Ctx, w: number, h: number, o: ArcadeOpts): void {
  const bay = w / o.bays;
  const col = o.column !== undefined ? Math.max(2.2, bay * 0.12) : Math.max(3, bay * 0.22);
  const openW = bay - col;
  const openH = h * (o.rise ?? 0.82);
  for (let i = 0; i < o.bays; i++) {
    const x = i * bay + col / 2;
    if (o.alfiz !== undefined) {
      ctx.fillStyle = css(shade(o.alfiz, o.light));
      ctx.fillRect(x - 1.5, -openH - 3.5, openW + 3, openH + 3.5);
      ctx.fillStyle = css(shade(o.wall, o.light * 1.02));
      ctx.fillRect(x, -openH - 2, openW, openH + 2);
    }
    // The gallery inside: dark under the vault, a lit floor at the foot.
    const g = ctx.createLinearGradient(0, -openH, 0, 0);
    g.addColorStop(0, css(shade(0x2a1d14, o.light)));
    g.addColorStop(0.7, css(shade(0x3f2e22, o.light)));
    g.addColorStop(1, css(shade(0x6a5240, o.light)));
    ctx.fillStyle = g;
    archPath(ctx, x, openW, openH, o.head);
    ctx.fill();
    ctx.strokeStyle = css(shade(o.wall, o.light * 0.72), 0.8);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // Columns (round shafts with a capital and a base) or square piers.
  for (let i = 0; i <= o.bays; i++) {
    const x = Math.min(w - col / 2, Math.max(col / 2, i * bay));
    const shaft = o.column ?? o.wall;
    const cw = o.column !== undefined ? col * 0.62 : col;
    const g = ctx.createLinearGradient(x - cw / 2, 0, x + cw / 2, 0);
    g.addColorStop(0, css(shade(shaft, o.light * 1.12)));
    g.addColorStop(1, css(shade(shaft, o.light * 0.78)));
    ctx.fillStyle = g;
    ctx.fillRect(x - cw / 2, -openH * 0.62, cw, openH * 0.62);
    ctx.fillStyle = css(shade(shaft, o.light * 1.05));
    ctx.fillRect(x - cw / 2 - 1, -openH * 0.62 - 2, cw + 2, 2.2);
    ctx.fillRect(x - cw / 2 - 0.8, -1.6, cw + 1.6, 1.6);
  }
  if (o.lattice) {
    ctx.strokeStyle = css(shade(o.wall, o.light * 0.8), 0.7);
    ctx.lineWidth = 0.7;
    const top = -h + 2;
    const bottom = -openH - 4;
    for (let x = -bottom + top; x < w + (bottom - top); x += 5) {
      ctx.beginPath();
      ctx.moveTo(x, bottom);
      ctx.lineTo(x + (bottom - top) * 0.6, top);
      ctx.moveTo(x, bottom);
      ctx.lineTo(x - (bottom - top) * 0.6, top);
      ctx.stroke();
    }
  }
}

export interface PavingOpts {
  /** Paving colour. */
  readonly color: number;
  /** Laying pattern: flags in a grid, a checker of two tones, or river pebbles. */
  readonly pattern: 'flags' | 'checker' | 'pebble';
  /** Second tone of the checker. */
  readonly alt?: number;
  /** Tile size of the grid (tiles). */
  readonly cell?: number;
}

/** Courtyard paving on u0..u1 × v0..v1 at height z. */
export function patioFloor(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, z: number, o: PavingOpts): void {
  const ctx = p.ctx;
  p.ground(u0, v0, u1, v1, o.color, z);
  const cell = o.cell ?? 0.2;
  if (o.pattern === 'checker') {
    const alt = o.alt ?? shade(o.color, 0.85);
    for (let u = u0, i = 0; u < u1 - 1e-6; u += cell, i++) {
      for (let v = v0, j = 0; v < v1 - 1e-6; v += cell, j++) {
        if ((i + j) % 2) continue;
        const pts: Pt[] = [p.p(u, v, z), p.p(Math.min(u1, u + cell), v, z), p.p(Math.min(u1, u + cell), Math.min(v1, v + cell), z), p.p(u, Math.min(v1, v + cell), z)];
        p.fillPoly(pts, css(alt));
      }
    }
  } else if (o.pattern === 'pebble') {
    for (let i = 0; i < 70 * (u1 - u0) * (v1 - v0) + 6; i++) {
      const [x, y] = p.p(u0 + p.random() * (u1 - u0), v0 + p.random() * (v1 - v0), z);
      ctx.fillStyle = css(shade(o.color, 0.7 + p.random() * 0.5), 0.8);
      ctx.fillRect(x - 1, y - 0.5, 2, 1);
    }
  }
  if (o.pattern !== 'pebble') {
    ctx.strokeStyle = css(shade(o.color, 0.68), 0.45);
    ctx.lineWidth = 0.8;
    for (let u = u0 + cell; u < u1 - 1e-6; u += cell) line(ctx, p.p(u, v0, z), p.p(u, v1, z));
    for (let v = v0 + cell; v < v1 - 1e-6; v += cell) line(ctx, p.p(u0, v, z), p.p(u1, v, z));
  }
}

/**
 * Shade on a courtyard floor along its two far edges (the walls behind
 * it), deepest at the foot of the walls: the inner patio shade.
 */
export function patioShade(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, z: number, depth: number, strength = 0.42): void {
  const ctx = p.ctx;
  const bands: Array<[Pt[], Pt, Pt]> = [
    [[p.p(u0, v0, z), p.p(u1, v0, z), p.p(u1, v0 + depth, z), p.p(u0 + depth, v0 + depth, z)], p.p(u0, v0, z), p.p(u0, v0 + depth, z)],
    [[p.p(u0, v0, z), p.p(u0 + depth, v0 + depth, z), p.p(u0 + depth, v1, z), p.p(u0, v1, z)], p.p(u0, v0, z), p.p(u0 + depth, v0, z)],
  ];
  for (const [pts, a, b] of bands) {
    const g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
    g.addColorStop(0, `rgba(30,22,16,${strength})`);
    g.addColorStop(1, 'rgba(30,22,16,0)');
    p.fillPoly(pts, g);
  }
}

function line(ctx: Ctx, a: Pt, b: Pt): void {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
}

/** Round canopy of leaves (orange, olive, lemon) with optional fruit, lit from the upper left. */
function canopy(p: IsoPainter, x: number, y: number, r: number, leaf: number, fruit?: string): void {
  const ctx = p.ctx;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const cx = x + Math.cos(a) * r * 0.45;
    const cy = y + Math.sin(a) * r * 0.32;
    const g = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, 0.5, cx, cy, r * 0.62);
    g.addColorStop(0, css(shade(leaf, 1.35)));
    g.addColorStop(1, css(shade(leaf, 0.7)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.58, 0, Math.PI * 2);
    ctx.fill();
  }
  p.normalCylinder(x - r, y - r * 0.8, r * 2, r * 1.6);
  if (!fruit) return;
  ctx.fillStyle = fruit;
  for (let i = 0; i < 7; i++) {
    const a = p.random() * Math.PI * 2;
    const d = p.random() * r * 0.8;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Tree with a round crown at ground point (u, v, z): orange (fruit) or olive (silvery, gnarled). */
export function roundTree(p: IsoPainter, u: number, v: number, z: number, size: number, kind: 'orange' | 'olive'): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, z);
  const trunk = kind === 'olive' ? 0x5e5246 : 0x5a3f2a;
  const h = size * (kind === 'olive' ? 0.75 : 1.1);
  ctx.strokeStyle = css(trunk);
  ctx.lineWidth = kind === 'olive' ? 2.6 : 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + (kind === 'olive' ? 3 : 0.5), y - h * 0.5, x - 1, y - h);
  ctx.stroke();
  canopy(p, x - 1, y - h - size * 0.35, size * 0.62, kind === 'olive' ? 0x7d8a5c : 0x3f6f2e, kind === 'orange' ? '#f39a26' : undefined);
  p.addVolumePoint(u, v, z + h + size * 0.9);
}

/** Tall Italian cypress (column of dark green) at (u, v, z). */
export function cypress(p: IsoPainter, u: number, v: number, z: number, h: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, z);
  const w = h * 0.13;
  const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
  g.addColorStop(0, '#4c7a3a');
  g.addColorStop(0.5, '#2f5a28');
  g.addColorStop(1, '#1d3a1a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.bezierCurveTo(x + w * 1.3, y - h * 0.6, x + w * 1.1, y - h * 0.1, x + w * 0.5, y);
  ctx.lineTo(x - w * 0.5, y);
  ctx.bezierCurveTo(x - w * 1.1, y - h * 0.1, x - w * 1.3, y - h * 0.6, x, y - h);
  ctx.fill();
  p.normalCylinder(x - w, y - h, w * 2, h);
  p.addVolumePoint(u, v, z + h);
}

/** Clay pot with a flowering plant (geranium red, or green) at (u, v, z). */
export function pot(p: IsoPainter, u: number, v: number, z: number, flower = '#d8343a'): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, z);
  ctx.fillStyle = '#b5603a';
  ctx.beginPath();
  ctx.moveTo(x - 3.5, y - 7);
  ctx.lineTo(x + 3.5, y - 7);
  ctx.lineTo(x + 2.5, y);
  ctx.lineTo(x - 2.5, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3e6a2c';
  ctx.beginPath();
  ctx.arc(x, y - 9.5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = flower;
  for (const [dx, dy] of [[-2, -11], [1.5, -12], [0, -9]] as const) ctx.fillRect(x + dx, y + dy, 1.8, 1.8);
}

/** Well head (brocal) with an iron arch and a bucket pulley at (u, v, z). */
export function well(p: IsoPainter, u: number, v: number, z: number, stone: number): void {
  helm(p, u, v, z, [[0, 0.12], [9, 0.12], [10, 0.13], [11, 0.13]], stone, false);
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, z + 11);
  ctx.fillStyle = '#16120e';
  ctx.beginPath();
  ctx.ellipse(x, y, 0.1 * Math.SQRT2 * HW, 0.1 * Math.SQRT2 * HH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#26211e';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(x - 9, y);
  ctx.quadraticCurveTo(x, y - 26, x + 9, y);
  ctx.stroke();
  ctx.fillRect(x - 0.5, y - 19, 1, 9);
  ctx.fillStyle = '#6a4a2a';
  ctx.fillRect(x - 2, y - 10, 4, 4);
  p.addVolumePoint(u, v, z + 30);
}

/** Low round or octagonal basin with water and a small jet at (u, v, z), radius r tiles. */
export function basin(p: IsoPainter, u: number, v: number, z: number, r: number, stone: number, jet = 14): void {
  const ctx = p.ctx;
  helm(p, u, v, z, [[0, r], [5, r], [6, r + 0.02], [7, r + 0.02]], stone, false);
  const [x, y] = p.p(u, v, z + 6);
  const rx = (r - 0.03) * Math.SQRT2 * HW;
  const g = ctx.createLinearGradient(x - rx, 0, x + rx, 0);
  g.addColorStop(0, '#a6d0dc');
  g.addColorStop(1, '#3b7890');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, rx * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  if (jet <= 0) return;
  ctx.strokeStyle = 'rgba(235,248,255,.85)';
  ctx.lineWidth = 1.1;
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x, y - jet);
    ctx.quadraticCurveTo(x + d * 4, y - jet - 6, x + d * rx * 0.6, y - 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x, y - 1);
  ctx.lineTo(x, y - jet - 4);
  ctx.stroke();
  p.addVolumePoint(u, v, z + 7);
}

/**
 * Long still pool (impluvium, alberca) on u0..u1 × v0..v1 at z: a stone
 * kerb round water that mirrors the sky, darker towards the far edge.
 */
export function pool(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, z: number, kerb: number): void {
  p.box(u0, v0, u1, v1, z, z + 3, { color: kerb }, shade(kerb, 1.08));
  const k = 0.05;
  const pts: Pt[] = [p.p(u0 + k, v0 + k, z + 3), p.p(u1 - k, v0 + k, z + 3), p.p(u1 - k, v1 - k, z + 3), p.p(u0 + k, v1 - k, z + 3)];
  const ys = pts.map((q) => q[1]);
  const g = p.ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
  g.addColorStop(0, '#2f6177');
  g.addColorStop(0.55, '#6fa6b8');
  g.addColorStop(1, '#b9dbe2');
  p.fillPoly(pts, g);
  // Glints along the near kerb.
  p.ctx.strokeStyle = css(mix(0xffffff, 0xb9dbe2, 0.3), 0.7);
  p.ctx.lineWidth = 1;
  line(p.ctx, p.p(u0 + 0.12, v1 - 0.09, z + 3), p.p(u1 - 0.2, v1 - 0.09, z + 3));
}
