import type { Ctx } from '../../canvas';
import { HW, type IsoPainter, type WallStyle } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import type { Block } from '../kits/lowHip';
import { finial, helm, type HelmProfile } from '../roofs';
import type { ArchStyle } from '../style';

/*
 * Pieces shared by the Italian families: brick and stucco walls, the
 * heavy Renaissance cornice (cornicione), Florentine rustication and
 * twin-light windows (bifore), machicolation corbels, vine pergolas,
 * hanging banners and small lantern domes.
 */

export type { Block };

/** Face painter (face-local, x along the wall, y up as negatives). */
export type FaceDraw = (w: number, h: number) => void;

export const brickWall = (s: ArchStyle): WallStyle => ({ color: s.palette.brick, detail: 'brick' });
export const stuccoWall = (s: ArchStyle): WallStyle => ({ color: s.palette.plaster, detail: 'plaster' });

/** A box whose two visible faces are handed to face painters. */
export function block(p: IsoPainter, [u0, v0, u1, v1]: Block, z0: number, z1: number, wall: WallStyle, left?: FaceDraw, right?: FaceDraw, top?: number): void {
  p.box(u0, v0, u1, v1, z0, z1, wall, top);
  if (left) p.leftFace(u0, u1, v1, z0, left, z1 - z0);
  if (right) p.rightFace(v0, v1, u1, z0, right, z1 - z0);
}

/** Florentine rustication (bugnato) over a face band from y0 to y1 (positive up): drafted blocks, deep joints. */
export function rustication(ctx: Ctx, w: number, y0: number, y1: number, color: number, light: number, course = 7): void {
  ctx.fillStyle = css(shade(color, light * 0.95));
  ctx.fillRect(0, -y1, w, y1 - y0);
  for (let y = y0, row = 0; y < y1 - 1; y += course, row++) {
    const ch = Math.min(course, y1 - y);
    for (let x = row % 2 ? -7 : 0; x < w; x += 14) {
      ctx.fillStyle = css(shade(color, light * (1.02 + ((x + row * 5) % 3) * 0.04)));
      ctx.fillRect(x + 1, -y - ch + 1, 12, ch - 2);
      ctx.fillStyle = css(shade(color, light * 1.2), 0.6);
      ctx.fillRect(x + 1, -y - ch + 1, 12, 1);
    }
    ctx.fillStyle = css(shade(color, light * 0.5), 0.8);
    ctx.fillRect(0, -y - 1, w, 1);
  }
}

/** Twin-light window (bifora) under a round arch, a colonnette between the lights (face-local). Records one glow. */
export function bifora(p: IsoPainter, frame: number, x: number, y: number, w: number, h: number, light: number, lit = true): void {
  const ctx = p.ctx;
  const r = w / 2;
  ctx.fillStyle = css(shade(frame, light));
  ctx.beginPath();
  ctx.moveTo(x - 2.5, y + h + 1.5);
  ctx.lineTo(x - 2.5, y + r);
  ctx.arc(x + r, y + r, r + 2.5, Math.PI, 0);
  ctx.lineTo(x + w + 2.5, y + h + 1.5);
  ctx.closePath();
  ctx.fill();
  if (lit) p.window(x, y, w, h, true);
  else {
    ctx.fillStyle = css(shade(0x2a1d14, light));
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, 0);
    ctx.lineTo(x + w, y + h);
    ctx.fill();
  }
  ctx.fillStyle = css(shade(frame, light * 1.05));
  ctx.fillRect(x + r - 0.9, y + r * 0.8, 1.8, h - r * 0.8);
  ctx.fillRect(x - 3, y + h, w + 6, 2);
}

/**
 * Heavy cornice (cornicione) crowning a block at z: a dark band of the
 * shadow it casts on both faces, then a projecting moulded slab
 * `overhang` tiles proud and `depth` px deep, with a dentil row.
 */
export function cornicione(p: IsoPainter, [u0, v0, u1, v1]: Block, z: number, depth: number, overhang: number, color: number): void {
  const ctx = p.ctx;
  const shadow = (w: number) => {
    const g = ctx.createLinearGradient(0, -8, 0, 0);
    g.addColorStop(0, 'rgba(25,18,12,.5)');
    g.addColorStop(1, 'rgba(25,18,12,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, -8, w, 8);
  };
  p.leftFace(u0, u1, v1, z - 8, shadow, 8);
  p.rightFace(v0, v1, u1, z - 8, shadow, 8);
  const o = overhang;
  p.box(u0 - o, v0 - o, u1 + o, v1 + o, z, z + depth, { color }, shade(color, 1.05));
  const dentils = (w: number, light: number) => {
    ctx.fillStyle = css(shade(color, light * 0.62));
    ctx.fillRect(0, -depth * 0.42, w, 1);
    for (let x = 1; x < w; x += 3.2) ctx.fillRect(x, -depth * 0.42, 1.5, 2.2);
    ctx.fillStyle = css(shade(color, light * 1.12));
    ctx.fillRect(0, -depth, w, 1.4);
  };
  p.leftFace(u0 - o, u1 + o, v1 + o, z, (w) => dentils(w, 1), depth);
  p.rightFace(v0 - o, v1 + o, u1 + o, z, (w) => dentils(w, R), depth);
}

/** Putlog holes (buche pontaie) left by the scaffold on a brick tower face. */
export function putlogs(ctx: Ctx, w: number, h: number, light: number): void {
  ctx.fillStyle = css(shade(0x2a1a12, light), 0.75);
  for (let y = 14, row = 0; y < h - 8; y += 15, row++) {
    for (let x = row % 2 ? 6 : 11; x < w - 3; x += 11) ctx.fillRect(x, -y, 2.2, 2.2);
  }
}

/**
 * Machicolation (beccatelli) round the top of a square shaft: a band of
 * stone corbels from z - h to z under a slab `overhang` tiles proud.
 * Returns the slab's footprint.
 */
export function machicolation(p: IsoPainter, [u0, v0, u1, v1]: Block, z: number, h: number, overhang: number, stone: number): Block {
  const ctx = p.ctx;
  const o = overhang;
  const corbels = (w: number, light: number) => {
    for (let x = 2; x < w - 2; x += 7) {
      ctx.fillStyle = css(shade(stone, light));
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 4, 0);
      ctx.lineTo(x + 3, -h * 0.9);
      ctx.lineTo(x + 1, -h * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = css(shade(0x20150d, light), 0.85);
      ctx.fillRect(x + 4.4, -h * 0.55, 2.2, h * 0.55);
    }
  };
  p.leftFace(u0, u1, v1, z - h, (w) => corbels(w, 1), h);
  p.rightFace(v0, v1, u1, z - h, (w) => corbels(w, R), h);
  const slab: Block = [u0 - o, v0 - o, u1 + o, v1 + o];
  p.box(slab[0], slab[1], slab[2], slab[3], z - 3, z, { color: stone }, shade(stone, 1.08));
  return slab;
}

/** Vine pergola on posts over u0..u1 × v0..v1 at z, its canopy `h` px up. */
export function pergola(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, z: number, h: number): void {
  const ctx = p.ctx;
  const posts: Array<readonly [number, number]> = [[u0, v0], [u1, v0], [u0, v1], [u1, v1]];
  ctx.strokeStyle = '#5a3e26';
  ctx.lineWidth = 2;
  for (const [u, v] of posts) {
    const a = p.p(u, v, z);
    const b = p.p(u, v, z + h);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  const canopy = [p.p(u0, v0, z + h), p.p(u1, v0, z + h), p.p(u1, v1, z + h), p.p(u0, v1, z + h)];
  p.fillPoly(canopy, 'rgba(70,110,48,.55)');
  for (let i = 0; i < 26 * (u1 - u0 + v1 - v0); i++) {
    const [x, y] = p.p(u0 + p.random() * (u1 - u0), v0 + p.random() * (v1 - v0), z + h + 1);
    ctx.fillStyle = css(shade(0x4f7d36, 0.75 + p.random() * 0.6));
    ctx.beginPath();
    ctx.arc(x, y, 2 + p.random() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  p.addVolumePoint(u0, v0, z + h + 2);
  p.addVolumePoint(u1, v1, z + h + 2);
}

/** Hanging banner in the owner's colour with a gold hem (face-local, top-left at x, y). */
export function banner(ctx: Ctx, x: number, y: number, w: number, h: number, team: number, light: number): void {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, css(shade(team, light * 1.1)));
  g.addColorStop(1, css(shade(team, light * 0.75)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w / 2, y + h - w * 0.45);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e2bd52';
  ctx.fillRect(x - 0.5, y, w + 1, 2);
}

/** Ribbed dome profile of a small cupola (radius r tiles, `h` px high). */
function cupolaProfile(r: number, h: number): HelmProfile {
  return [[0, r], [h * 0.22, r * 0.97], [h * 0.45, r * 0.86], [h * 0.65, r * 0.68], [h * 0.82, r * 0.45], [h * 0.94, r * 0.22], [h, r * 0.06]];
}

/**
 * Small lantern dome on (u, v, z): a drum `drum` px high with dark
 * openings, a cornice ring, a ribbed dome of radius r tiles and a tiny
 * lantern with a gilt ball. Returns the top.
 */
export function cupola(p: IsoPainter, u: number, v: number, z: number, r: number, drum: number, wall: number, dome: number, trim: number): number {
  const ctx = p.ctx;
  helm(p, u, v, z, [[0, r * 1.08], [drum, r * 1.08]], wall, false);
  if (drum >= 8) {
    const [x, y] = p.p(u, v, z);
    const rx = r * 1.08 * Math.SQRT2 * HW;
    ctx.fillStyle = 'rgba(28,20,14,.85)';
    for (const k of [-0.55, 0, 0.55]) {
      const wx = x + k * rx;
      ctx.beginPath();
      ctx.moveTo(wx - 2, y - 2);
      ctx.lineTo(wx - 2, y - drum + 5);
      ctx.arc(wx, y - drum + 5, 2, Math.PI, 0);
      ctx.lineTo(wx + 2, y - 2);
      ctx.fill();
    }
  }
  helm(p, u, v, z + drum, [[0, r * 1.2], [2.5, r * 1.2]], trim, false);
  const dh = r * 72;
  helm(p, u, v, z + drum + 2.5, cupolaProfile(r * 1.08, dh), dome);
  const lz = z + drum + 2.5 + dh - 1;
  helm(p, u, v, lz, [[0, r * 0.3], [r * 30, r * 0.3], [r * 30 + 2, r * 0.36], [r * 30 + 5, r * 0.1]], trim, false);
  const top = lz + r * 30 + 5;
  finial(p, u, v, top, 7, false);
  return top + 7;
}

/** Nest holes (columbaria) in rows near the top of a dovecote face (face-local). */
export function nestHoles(ctx: Ctx, w: number, h: number, light: number): void {
  ctx.fillStyle = css(shade(0x2a1d14, light));
  for (let r = 0; r < 3; r++) for (let x = 4 + (r % 2) * 3; x < w - 3; x += 6) ctx.fillRect(x, -h + 8 + r * 5, 2.4, 2.4);
}

/** Smith's anvil on its block at ground point (u, v). */
export function anvil(p: IsoPainter, u: number, v: number): void {
  const [x, y] = p.p(u, v, 0);
  p.ctx.fillStyle = '#3a3a40';
  p.ctx.fillRect(x - 8, y - 9, 16, 4);
  p.ctx.fillRect(x - 3, y - 6, 6, 6);
}

export { cypress } from '../kits/patio';
export { lowHip } from '../kits/lowHip';
