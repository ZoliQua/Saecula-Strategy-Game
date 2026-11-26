import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { needleSpire } from '../kits/needleSpire';
import type { ArchStyle } from '../style';
import type { Block } from './biskupinParts';

/*
 * Shared parts of Kraków brick Gothic (Polish age 2): red brick laid
 * with a diaper of dark glazed headers (zendrówka), white limestone
 * string courses and window surrounds, tall lancets, and the corner
 * pinnacles that ring a spire's foot.
 */

/** Face painter in face-local px (x along the face, y up as negative). */
export type Face = (w: number, h: number) => void;

/** Diaper of dark glazed headers over a brick face (face-local). */
export function diaper(ctx: Ctx, w: number, h: number, brick: number, light: number): void {
  ctx.fillStyle = css(shade(brick, light * 0.82), 0.45);
  for (let y = 3; y < h; y += 4.2) ctx.fillRect(0, -y, w, 0.6);
  ctx.fillStyle = css(shade(brick, light * 0.48), 0.7);
  for (let row = 0, y = 6; y < h - 4; row++, y += 8.4) {
    for (let x = (row % 2) * 7; x < w; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, -y - 2.4);
      ctx.lineTo(x + 2.4, -y);
      ctx.lineTo(x, -y + 2.4);
      ctx.lineTo(x - 2.4, -y);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/** White stone string course at face height y (face-local, y negative up). */
export function stringCourse(ctx: Ctx, w: number, y: number, trim: number, light: number): void {
  ctx.fillStyle = css(shade(trim, light));
  ctx.fillRect(0, y - 1.6, w, 2.4);
  ctx.fillStyle = 'rgba(30,14,8,.35)';
  ctx.fillRect(0, y + 0.8, w, 0.8);
}

/** Lancet (pointed) window in a white stone surround, x..x+w, bottom at y (face-local); lit. */
export function lancet(p: IsoPainter, s: ArchStyle, x: number, y: number, w: number, h: number, light: number, lit = true): void {
  const ctx = p.ctx;
  const t = 1.6;
  ctx.fillStyle = css(shade(s.palette.ashlar, light));
  ctx.beginPath();
  ctx.moveTo(x - t, y);
  ctx.lineTo(x - t, y - h + w * 0.5);
  ctx.quadraticCurveTo(x - t, y - h - t, x + w / 2, y - h - t * 2.2);
  ctx.quadraticCurveTo(x + w + t, y - h - t, x + w + t, y - h + w * 0.5);
  ctx.lineTo(x + w + t, y);
  ctx.closePath();
  ctx.fill();
  if (lit) p.window(x, y - h, w, h, true);
  else {
    ctx.fillStyle = '#20140c';
    ctx.fillRect(x, y - h + w * 0.4, w, h - w * 0.4);
  }
}

/** A block of diapered brick from z0 to z1 with white courses at `courses` heights; faces painted after. */
export function brickBlock(p: IsoPainter, s: ArchStyle, b: Block, z0: number, z1: number, left?: Face, right?: Face, courses: readonly number[] = []): void {
  const c = s.palette;
  const [u0, v0, u1, v1] = b;
  p.box(u0, v0, u1, v1, z0, z1, { color: c.brick }, c.brick);
  const face = (light: number, extra?: Face): Face => (w, h) => {
    diaper(p.ctx, w, h, c.brick, light);
    // Limestone plinth.
    p.ctx.fillStyle = css(shade(c.ashlar, light * 0.9));
    if (z0 === 0) p.ctx.fillRect(0, -5, w, 5);
    for (const y of courses) stringCourse(p.ctx, w, -y, c.trim, light);
    extra?.(w, h);
  };
  p.leftFace(u0, u1, v1, z0, face(1, left), z1 - z0);
  p.rightFace(v0, v1, u1, z0, face(R, right), z1 - z0);
}

/** Stepped brick buttress against the +v face at u (a thin box with a white-capped offset). */
export function buttressLeft(p: IsoPainter, s: ArchStyle, u: number, v: number, h: number): void {
  const c = s.palette;
  p.box(u - 0.05, v, u + 0.05, v + 0.12, 0, h * 0.55, { color: c.brick }, c.trim);
  p.box(u - 0.04, v, u + 0.04, v + 0.07, h * 0.55, h, { color: c.brick }, c.trim);
}

/** Stepped brick buttress against the +u face at v. */
export function buttressRight(p: IsoPainter, s: ArchStyle, u: number, v: number, h: number): void {
  const c = s.palette;
  p.box(u, v - 0.05, u + 0.12, v + 0.05, 0, h * 0.55, { color: c.brick }, c.trim);
  p.box(u, v - 0.04, u + 0.07, v + 0.04, h * 0.55, h, { color: c.brick }, c.trim);
}

/** Four small needle pinnacles at the corners of a square tower top b at z (the far ones first). */
export function cornerPinnacles(p: IsoPainter, s: ArchStyle, b: Block, z: number, rise: number, r = 0.07, which: 'back' | 'front' | 'all' = 'all'): void {
  const [u0, v0, u1, v1] = b;
  const back: ReadonlyArray<readonly [number, number]> = [[u0, v0], [u1, v0], [u0, v1]];
  const front: ReadonlyArray<readonly [number, number]> = [[u1, v1]];
  const set = which === 'back' ? back : which === 'front' ? front : [...back, ...front];
  for (const [u, v] of set) needleSpire(p, u, v, r, z, rise, s.palette.metal, 'copper', 8);
}

/** A gilded crown ring round a spire at canvas point (x, y), radius rx px. */
export function crownRing(ctx: Ctx, x: number, y: number, rx: number): void {
  const gold = '#e2b23c';
  const dark = '#9c7420';
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, rx * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.ellipse(x, y - 1.6, rx, rx * 0.5, 0, 0, Math.PI);
  ctx.lineTo(x - rx, y - 1.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - rx, y - 4.5, rx * 2, 3);
  // Fleurons on the front half.
  for (let i = 0; i <= 4; i++) {
    const a = Math.PI - (i / 4) * Math.PI;
    const fx = x + Math.cos(a) * rx;
    const fy = y - 4.5 + Math.sin(a) * rx * 0.5;
    ctx.beginPath();
    ctx.moveTo(fx - 1.6, fy);
    ctx.lineTo(fx, fy - 4.2);
    ctx.lineTo(fx + 1.6, fy);
    ctx.closePath();
    ctx.fill();
  }
}
