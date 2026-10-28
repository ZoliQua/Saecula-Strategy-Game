import type { Ctx } from '../../canvas';
import { HW, type IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { arcade, basin } from '../kits/patio';
import { helm } from '../roofs';
import type { ArchStyle } from '../style';
import { ajimez } from './hispaniaOrnament';
import { hip, terrace, type Block } from './hispaniaParts';

/*
 * Alhambra parts: red rammed-earth (tapial) walls with their formwork
 * lifts and putlog holes, ivory stucco courts with slender marble
 * colonnades, the pavilions (templetes) of the Court of the Lions, the
 * Fountain of the Lions and clipped myrtle hedges.
 */

export const TAPIAL = 0xb9654a;
export const STUCCO = 0xeadfc6;
export const MARBLE = 0xf2ede2;
export const MYRTLE = 0x3d6a32;

/** Formwork lifts and putlog holes of rammed earth (face-local). */
export function tapialFace(ctx: Ctx, w: number, h: number, light: number): void {
  for (let y = 11, row = 0; y < h - 2; y += 11, row++) {
    ctx.fillStyle = css(shade(TAPIAL, light * 0.78), 0.6);
    ctx.fillRect(0, -y, w, 0.9);
    ctx.fillStyle = css(shade(0x2a1a12, light), 0.7);
    for (let x = 6 + (row % 2) * 9; x < w - 3; x += 18) ctx.fillRect(x, -y - 2.5, 1.6, 1.6);
  }
}

/** Which glazed windows a face shows (none on hidden faces). */
export interface Lights {
  readonly xs: readonly number[];
  readonly y: number;
}

/**
 * Tapial block: red rammed earth with formwork lines; optional ajimez
 * windows (fractions of the face width) on its visible faces.
 */
export function tapialBlock(p: IsoPainter, s: ArchStyle, [u0, v0, u1, v1]: Block, z0: number, z1: number, left?: Lights, right?: Lights, raw = false): void {
  const color = raw ? shade(TAPIAL, 0.9) : TAPIAL;
  p.box(u0, v0, u1, v1, z0, z1, { color }, raw ? shade(TAPIAL, 0.5) : shade(TAPIAL, 0.9));
  const face = (lights: Lights | undefined, light: number) => (w: number, h: number) => {
    tapialFace(p.ctx, w, h, light);
    if (raw || !lights) return;
    for (const x of lights.xs) ajimez(p, s, w * x - 7, -h + lights.y, 14, 14, light);
  };
  p.leftFace(u0, u1, v1, z0, face(left, 1), z1 - z0);
  p.rightFace(v0, v1, u1, z0, face(right, R), z1 - z0);
}

/** Ivory stucco gallery front with a marble colonnade (face-local), cusped arches and sebka lattice above. */
export function courtArcade(ctx: Ctx, w: number, h: number, bays: number, light: number): void {
  ctx.fillStyle = css(shade(STUCCO, light));
  ctx.fillRect(0, -h, w, h);
  arcade(ctx, w, h, { bays, head: 'lobed', wall: STUCCO, column: MARBLE, light, rise: 0.66, lattice: true });
}

/**
 * Pavilion (templete) of the Court of the Lions on block b: marble
 * columns at the corners and between, a stucco attic with lattice, and a
 * pyramid tile roof (or bare, while building).
 */
export function pavilion(p: IsoPainter, s: ArchStyle, b: Block, z0: number, h: number, roofed: boolean): void {
  const [u0, v0, u1, v1] = b;
  const ctx = p.ctx;
  const cols: Array<readonly [number, number]> = [];
  for (const u of [u0 + 0.03, (u0 + u1) / 2, u1 - 0.03]) cols.push([u, v1 - 0.03]);
  for (const v of [v0 + 0.03, (v0 + v1) / 2]) cols.push([u1 - 0.03, v]);
  // Back of the attic, seen through the columns.
  p.box(u0, v0, u1, v0 + 0.04, z0 + h * 0.62, z0 + h, { color: shade(STUCCO, 0.8) });
  p.box(u0, v0, u0 + 0.04, v1, z0 + h * 0.62, z0 + h, { color: shade(STUCCO, 0.8) });
  for (const [u, v] of cols) {
    const [x, y] = p.p(u, v, z0);
    const g = ctx.createLinearGradient(x - 1.6, 0, x + 1.6, 0);
    g.addColorStop(0, css(MARBLE));
    g.addColorStop(1, css(shade(MARBLE, 0.7)));
    ctx.fillStyle = g;
    ctx.fillRect(x - 1.6, y - h * 0.62, 3.2, h * 0.62);
    p.normalCylinder(x - 1.6, y - h * 0.62, 3.2, h * 0.62);
  }
  // Front attic faces with lattice.
  p.box(u0, v1 - 0.04, u1, v1, z0 + h * 0.62, z0 + h, { color: STUCCO });
  p.box(u1 - 0.04, v0, u1, v1, z0 + h * 0.62, z0 + h, { color: STUCCO });
  const lattice = (light: number) => (w: number, hh: number) => {
    ctx.strokeStyle = css(shade(STUCCO, light * 0.7), 0.8);
    ctx.lineWidth = 0.7;
    for (let x = -hh; x < w + hh; x += 4) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + hh, -hh);
      ctx.moveTo(x, 0);
      ctx.lineTo(x - hh, -hh);
      ctx.stroke();
    }
  };
  p.leftFace(u0, u1, v1, z0 + h * 0.62, lattice(1), h * 0.38);
  p.rightFace(v0, v1, u1, z0 + h * 0.62, lattice(R), h * 0.38);
  if (roofed) {
    const prev = p.material;
    p.material = 'tile';
    p.hipRoof(u0, v0, u1, v1, z0 + h, 30, s.palette.roof, 0.05);
    p.material = prev;
    const [x, y] = p.p((u0 + u1) / 2, (v0 + v1) / 2, z0 + h + 30);
    ctx.fillStyle = '#d9b14a';
    for (const dy of [2.5, 6]) {
      ctx.beginPath();
      ctx.arc(x, y - dy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  p.addVolumePoint((u0 + u1) / 2, (v0 + v1) / 2, z0 + h + (roofed ? 36 : 0));
}

/** The Fountain of the Lions: twelve-sided basin on a ring of twelve stone lions, an upper bowl and a jet. */
export function lionsFountain(p: IsoPainter, u: number, v: number, z: number, water: boolean): void {
  const ctx = p.ctx;
  const r = 0.26;
  // Back lions first, then the basin, then the front lions.
  const lions = [...Array(12).keys()].map((k) => (k / 12) * Math.PI * 2).sort((a, b) => Math.cos(a) + Math.sin(a) - (Math.cos(b) + Math.sin(b)));
  const lion = (a: number) => {
    const [x, y] = p.p(u + r * Math.cos(a), v + r * Math.sin(a), z);
    ctx.fillStyle = css(shade(MARBLE, 0.85 + 0.15 * Math.sin(a + 0.8)));
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 3.6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(shade(0xb89a6a, 1));
    ctx.beginPath();
    ctx.arc(x, y - 8, 2.3, 0, Math.PI * 2);
    ctx.fill();
  };
  for (const a of lions) if (Math.cos(a) + Math.sin(a) <= 0) lion(a);
  basin(p, u, v, z + 6, 0.2, MARBLE, 0);
  helm(p, u, v, z + 13, [[0, 0.03], [8, 0.03], [9, 0.1], [11, 0.11]], MARBLE, false);
  if (water) {
    const [x, y] = p.p(u, v, z + 24);
    ctx.strokeStyle = 'rgba(235,248,255,.85)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 10);
    ctx.stroke();
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x, y - 9);
      ctx.quadraticCurveTo(x + d * 6, y - 12, x + d * 0.11 * Math.SQRT2 * HW, y + 2);
      ctx.stroke();
    }
  }
  for (const a of lions) if (Math.cos(a) + Math.sin(a) > 0) lion(a);
  p.addVolumePoint(u, v, z + 26);
}

/** Clipped myrtle hedge along u0..u1 × v0..v1. */
export function myrtles(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, z: number): void {
  p.box(u0, v0, u1, v1, z, z + 7, { color: MYRTLE }, shade(MYRTLE, 1.25));
}

/** The Comares tower on block b: tapial, ajimez windows high up, a terrace behind stepped merlons. */
export function comares(p: IsoPainter, s: ArchStyle, b: Block, z0: number, top: number, team: number | null): void {
  tapialBlock(p, s, b, z0, top, { xs: [0.3, 0.7], y: 34 }, { xs: [0.3, 0.7], y: 34 }, team === null && top < 150);
  if (team === null && top < 150) return;
  p.leftFace(b[0], b[2], b[3], z0, (w, h) => {
    for (const x of [0.5]) ajimez(p, s, w * x - 7, -h + 74, 14, 14, 1);
  }, top - z0);
  terrace(p, s, b, top, { parapet: 5, merlons: true, color: TAPIAL });
  if (team !== null) p.flag(b[2] - 0.1, b[3] - 0.1, top + 14, 36, team, true);
}

/** Low tile hip over a range (the Alhambra's roofs are terracotta). */
export function rangeRoof(p: IsoPainter, s: ArchStyle, b: Block, z: number): void {
  hip(p, s, b, z, 22);
}
