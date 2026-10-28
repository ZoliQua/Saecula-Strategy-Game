import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { CHARGES } from '../charges';
import { cornice, pilasters, quoins, R } from '../facade';
import type { ArchStyle } from '../style';
import { statue } from '../wonderParts';

type Pt = readonly [number, number];

/*
 * Versailles parts: palace blocks (rusticated arcades, a piano nobile of
 * tall arched windows between paired pilasters, an attic storey),
 * balustraded roof lines with statues, gilt roof ornament, the gilded
 * royal gate with Louis XIV's sun, and the equestrian statue.
 */

export type Block = readonly [u0: number, v0: number, u1: number, v1: number];

export const GILT = 0xd9b04a;
/** Ground storey (arcades) and piano nobile heights, art px above the podium. */
export const GROUND = 30;
export const NOBLE = 70;

/** Face of a palace block: which glazed bays show (fractions of the face hidden behind later blocks get none). */
export interface FaceSpec {
  readonly bays: number;
  /** Spans of the face (fractions of its width) covered by later blocks: no glazing there. */
  readonly hidden?: ReadonlyArray<readonly [number, number]>;
  /** Unfinished shell: dark openings, no glazing, no ornament. */
  readonly raw?: boolean;
}

/** Arcaded ground storey, tall arched piano-nobile windows, attic lights; pilasters and quoins (face-local). */
function palaceFace(p: IsoPainter, s: ArchStyle, w: number, h: number, light: number, f: FaceSpec): void {
  const ctx = p.ctx;
  const c = s.palette;
  const covered = (x: number) => (f.hidden ?? []).some(([a, b]) => x >= a * w - 4 && x <= b * w + 4);
  // Rustication of the ground storey.
  ctx.fillStyle = css(shade(c.stone, light * 0.7), 0.5);
  for (let y = 6; y < GROUND; y += 6) ctx.fillRect(0, -y, w, 0.9);
  if (!f.raw) {
    const xs = Array.from({ length: f.bays + 1 }, (_, i) => Math.min(w - 3, Math.max(3, (w / f.bays) * i)));
    pilasters(ctx, h, xs, c.trim, 3.5, light * 0.98);
    quoins(ctx, w, h, c.trim, light);
    cornice(ctx, w, GROUND, c.trim, light, 4);
    cornice(ctx, w, NOBLE, c.trim, light, 5);
  }
  for (let i = 0; i < f.bays; i++) {
    const x = (w / f.bays) * (i + 0.5);
    // Ground arcade (dark, unglazed).
    ctx.fillStyle = f.raw ? '#3a3026' : '#2a2219';
    ctx.beginPath();
    ctx.moveTo(x - 4, 0);
    ctx.lineTo(x - 4, -GROUND + 12);
    ctx.arc(x, -GROUND + 12, 4, Math.PI, 0);
    ctx.lineTo(x + 4, 0);
    ctx.fill();
    if (f.raw) {
      ctx.fillRect(x - 4, -NOBLE + 8, 8, 26);
      continue;
    }
    if (covered(x)) continue;
    ctx.fillStyle = css(shade(c.trim, light));
    ctx.fillRect(x - 5.5, -NOBLE + 5, 11, 34);
    p.window(x - 4, -NOBLE + 7, 8, 30, true);
    if (h > NOBLE + 8) {
      ctx.fillStyle = '#2c2a2c';
      ctx.fillRect(x - 3, -h + 4, 6, 6);
    }
  }
}

/** A palace block from z0 to z1: limestone walls with the face specs, a flat leaded top when `flat`. */
export function palaceBlock(p: IsoPainter, s: ArchStyle, [u0, v0, u1, v1]: Block, z0: number, z1: number, left: FaceSpec, right: FaceSpec): void {
  const c = s.palette;
  const color = left.raw ? shade(c.ashlar, 0.94) : c.plaster;
  // Raw shells show their dark insides; finished flat tops are pale lead terraces.
  p.box(u0, v0, u1, v1, z0, z1, { color, detail: 'stone' }, left.raw ? shade(c.ashlar, 0.42) : 0xb4b0a6);
  p.leftFace(u0, u1, v1, z0, (w, h) => palaceFace(p, s, w, h, 1, left), z1 - z0);
  p.rightFace(v0, v1, u1, z0, (w, h) => palaceFace(p, s, w, h, R, right), z1 - z0);
}

/** Balustrade along the two visible top edges of a flat-roofed block, with statues and trophies on its piers. */
export function roofBalustrade(p: IsoPainter, [u0, v0, u1, v1]: Block, z: number, statues: boolean): void {
  const ctx = p.ctx;
  const edges: Array<[Pt, Pt, number]> = [[[u0, v1], [u1, v1], u1 - u0], [[u1, v1], [u1, v0], v1 - v0]];
  for (const [[a0, b0], [a1, b1], len] of edges) {
    const n = Math.max(2, Math.round(len / 0.05));
    for (let i = 0; i <= n; i++) {
      const [x, y] = p.p(a0 + ((a1 - a0) * i) / n, b0 + ((b1 - b0) * i) / n, z);
      ctx.fillStyle = i % 6 === 0 ? '#f2ecdf' : '#ddd5c3';
      ctx.fillRect(x - (i % 6 === 0 ? 2 : 1), y - (i % 6 === 0 ? 10 : 7), i % 6 === 0 ? 4 : 2, i % 6 === 0 ? 10 : 7);
    }
    const s0 = p.p(a0, b0, z + 8);
    const s1 = p.p(a1, b1, z + 8);
    ctx.strokeStyle = '#f5f0e4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s0[0], s0[1]);
    ctx.lineTo(s1[0], s1[1]);
    ctx.stroke();
    if (!statues) continue;
    const m = Math.max(1, Math.round(len / 0.32));
    for (let i = 0; i <= m; i++) statue(p, a0 + ((a1 - a0) * i) / m, b0 + ((b1 - b0) * i) / m, z + 8);
  }
  p.addVolumePoint(u1, v1, z + 26);
}

/** Gilt lines along canvas points (ridges, curbs, cresting). */
export function giltLine(ctx: Ctx, pts: readonly Pt[], width = 1.6): void {
  ctx.strokeStyle = css(GILT, 0.95);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke();
}

/** Louis XIV's sun: a gilt disc with alternating straight and flaming rays at canvas (x, y). */
export function sunburst(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.fillStyle = css(GILT);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const l = r * (k % 2 ? 1.5 : 2.1);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a - 0.12) * r * 0.8, y + Math.sin(a - 0.12) * r * 0.8);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.lineTo(x + Math.cos(a + 0.12) * r * 0.8, y + Math.sin(a + 0.12) * r * 0.8);
    ctx.fill();
  }
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0.3, x, y, r);
  g.addColorStop(0, '#fff3b8');
  g.addColorStop(1, '#b8862a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * The Grille royale along v from u0 to u1: black railings with gilt spear
 * heads, stone piers with team banners at the gate, gilt gate leaves
 * under an arch of scrollwork crowned by the sun and the charge.
 */
export function royalGate(p: IsoPainter, s: ArchStyle, u0: number, u1: number, v: number, z: number, team: number): void {
  const ctx = p.ctx;
  const um = (u0 + u1) / 2;
  const n = Math.round((u1 - u0) / 0.035);
  for (let i = 0; i <= n; i++) {
    const u = u0 + ((u1 - u0) * i) / n;
    if (Math.abs(u - um) < 0.2) continue;
    const [x, y] = p.p(u, v, z);
    ctx.fillStyle = '#1e1d22';
    ctx.fillRect(x - 0.6, y - 20, 1.2, 20);
    ctx.fillStyle = css(GILT);
    ctx.fillRect(x - 1, y - 23, 2, 3);
  }
  for (const zz of [z + 4, z + 17]) giltLine(ctx, [p.p(u0, v, zz), p.p(um - 0.2, v, zz)], 1.2);
  for (const zz of [z + 4, z + 17]) giltLine(ctx, [p.p(um + 0.2, v, zz), p.p(u1, v, zz)], 1.2);
  // Piers with trophies and the team's banners.
  for (const u of [um - 0.24, um + 0.2]) {
    p.box(u, v - 0.04, u + 0.06, v + 0.04, z, z + 34, { color: s.palette.ashlar, detail: 'stone' }, s.palette.trim);
    const [x, y] = p.p(u + 0.03, v + 0.04, z + 34);
    ctx.fillStyle = css(GILT);
    ctx.beginPath();
    ctx.arc(x, y - 4, 3.2, 0, Math.PI * 2);
    ctx.fill();
    const [bx, by] = p.p(u + 0.03, v + 0.04, z + 30);
    ctx.fillStyle = css(team);
    ctx.fillRect(bx - 3.5, by, 7, 16);
    CHARGES[s.charge](ctx, bx, by + 6, 2.8);
  }
  // Gate leaves and the overthrow with the sun.
  p.leftFace(um - 0.18, um + 0.2, v, z, (w) => {
    ctx.fillStyle = '#1e1d22';
    for (let x = 2; x < w; x += 3) ctx.fillRect(x, -30, 1, 30);
    ctx.strokeStyle = css(GILT);
    ctx.lineWidth = 1.4;
    for (const cx of [w * 0.25, w * 0.75]) {
      ctx.beginPath();
      ctx.arc(cx, -15, 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.quadraticCurveTo(w / 2, -44, w, -30);
    ctx.stroke();
    sunburst(ctx, w / 2, -44, 4.5);
  }, 60);
  p.addVolumePoint(um, v, z + 50);
}

/** Bronze equestrian statue of the king on a stone pedestal at (u, v). */
export function equestrian(p: IsoPainter, s: ArchStyle, u: number, v: number, z: number): void {
  p.box(u - 0.12, v - 0.08, u + 0.12, v + 0.08, z, z + 16, { color: s.palette.trim, detail: 'stone' }, s.palette.trim);
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, z + 16);
  ctx.fillStyle = '#3e4a3c';
  ctx.beginPath();
  ctx.ellipse(x, y - 9, 8, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const dx of [-6, -3, 4, 7]) ctx.fillRect(x + dx - 0.8, y - 6, 1.6, 6);
  ctx.beginPath();
  ctx.moveTo(x + 5, y - 11);
  ctx.lineTo(x + 10, y - 19);
  ctx.lineTo(x + 12, y - 17);
  ctx.lineTo(x + 8, y - 9);
  ctx.fill();
  ctx.fillRect(x - 2, y - 20, 4, 9);
  ctx.beginPath();
  ctx.arc(x, y - 22, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,220,190,.35)';
  ctx.fillRect(x - 6, y - 12, 10, 1.2);
  p.normalCylinder(x - 9, y - 24, 22, 24);
  p.addVolumePoint(u, v, z + 40);
}
