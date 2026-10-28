import { HW, type IsoPainter } from '../../isoPainter';
import { N_LEFT, N_RIGHT } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { logBox } from '../kits/logWall';
import { brokenGable } from '../kits/shingleRoof';
import { turfRoof } from '../kits/turfRoof';
import { post } from '../parts';
import type { ArchStyle, NordicKits } from '../style';

type Pt = readonly [number, number];

/*
 * Pieces of the Finnish (nordic) town: log or board-clad blocks, the
 * age's main roof (turf, shingle gable or shingled gambrel), small
 * framed windows, storehouses on stilts (aitta), bark kotas, hay racks
 * (haasia), slanted pole fences (riukuaita) and granite fieldstones.
 */

export type Block = readonly [u0: number, v0: number, u1: number, v1: number];
export type FaceDraw = (w: number, h: number) => void;

const FIRST_AGE: NordicKits = { walls: 'logs', roofs: 'turf', civic: 'longhouse', belfry: 'lookout', works: 'homestead' };

/** The style's nordic reading; absent = the first-age reading (logs under turf). */
export function nordic(s: ArchStyle): NordicKits {
  return s.kits?.nordic ?? FIRST_AGE;
}

/** Vertical board cladding with white corner boards and an eave board, face-local. */
function boards(p: IsoPainter, s: ArchStyle, light: number, corners: 'both' | 'right' | 'left'): FaceDraw {
  return (w, h) => {
    const ctx = p.ctx;
    ctx.fillStyle = css(shade(s.palette.darkWood, light * 0.7), 0.55);
    for (let x = 4; x < w; x += 4.5) ctx.fillRect(x, -h, 0.8, h);
    ctx.fillStyle = css(shade(s.palette.trim, light));
    if (corners !== 'right') ctx.fillRect(0, -h, 3.5, h);
    if (corners !== 'left') ctx.fillRect(w - 3.5, -h, 3.5, h);
    ctx.fillRect(0, -h, w, 2.5);
    ctx.fillStyle = css(shade(s.palette.trim, light * 0.8));
    ctx.fillRect(0, -3, w, 3);
  };
}

/** A wall block in the age's material; face painters run in face-local coords after the cladding. */
export function wallBlock(p: IsoPainter, s: ArchStyle, b: Block, z0: number, z1: number, left?: FaceDraw, right?: FaceDraw, ends = 0.07): void {
  const [u0, v0, u1, v1] = b;
  if (nordic(s).walls === 'logs') logBox(p, u0, v0, u1, v1, z0, z1, s.palette.darkWood, ends);
  else {
    p.box(u0, v0, u1, v1, z0, z1, { color: s.palette.darkWood }, s.palette.darkWood);
    p.leftFace(u0, u1, v1, z0, boards(p, s, 1, 'both'), z1 - z0);
    p.rightFace(v0, v1, u1, z0, boards(p, s, R, 'both'), z1 - z0);
  }
  if (left) p.leftFace(u0, u1, v1, z0, left, z1 - z0);
  if (right) p.rightFace(v0, v1, u1, z0, right, z1 - z0);
}

/** Granite fieldstone footing a little wider than the block; returns its top. */
export function footing(p: IsoPainter, s: ArchStyle, b: Block, h = 6): number {
  const [u0, v0, u1, v1] = b;
  p.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, h, { color: s.palette.stone, detail: 'fieldstone' }, s.palette.stone);
  return h;
}

/** Vertical boards in a gable, face-local (the triangle is clipped by the roof painter). */
function gableBoards(p: IsoPainter, color: number, light: number): (w: number, rise: number) => void {
  return (w, rise) => {
    p.ctx.fillStyle = css(shade(color, light * 0.62), 0.55);
    for (let x = 3; x < w; x += 5) p.ctx.fillRect(x, -rise, 0.9, rise);
  };
}

export interface RoofOpts {
  /** Multiplies the age's default rise. */
  readonly scale?: number;
  /** Overhang (tiles). */
  readonly overhang?: number;
}

/**
 * The age's main roof over a block, ridge along `axis`: rounded turf
 * (age 1), a shingled gable (age 2) or a shingled gambrel with white
 * verges (age 3). Rises scale with the half-width across the ridge.
 * Returns the ridge height.
 */
export function mainRoof(p: IsoPainter, s: ArchStyle, b: Block, eave: number, axis: 'u' | 'v', o: RoofOpts = {}): number {
  const [u0, v0, u1, v1] = b;
  const half = axis === 'u' ? (v1 - v0) / 2 : (u1 - u0) / 2;
  const k = o.scale ?? 1;
  const c = s.palette;
  const kind = nordic(s).roofs;
  if (kind === 'turf') return turfRoof(p, u0, v0, u1, v1, eave, Math.round(46 * half * k), axis, { turf: c.roof, gable: c.darkWood, bark: c.trim, overhang: o.overhang ?? 0.1 });
  const prev = p.material;
  p.material = 'shingle';
  let top: number;
  if (kind === 'shingle') {
    const rise = Math.round(84 * half * k);
    p.gableRoof(u0, v0, u1, v1, eave, rise, c.roof, c.darkWood, axis, o.overhang ?? 0.09, gableBoards(p, c.darkWood, axis === 'u' ? R : 1));
    top = eave + rise;
  } else {
    top = brokenGable(p, u0, v0, u1, v1, eave, Math.round(62 * half * k), Math.round(24 * half * k), c.roof, c.darkWood, axis, {
      overhang: o.overhang ?? 0.07,
      trim: c.trim,
      breakAt: 0.34,
      gable: gableBoards(p, c.darkWood, axis === 'u' ? R : 1),
    });
  }
  p.material = prev;
  return top;
}

/** Small framed window, face-local; `lit` records a glow (only for windows that show). */
export function nWindow(p: IsoPainter, s: ArchStyle, x: number, y: number, w: number, h: number, light: number, lit = true): void {
  const ctx = p.ctx;
  const boarded = nordic(s).walls === 'boards';
  ctx.fillStyle = css(shade(boarded ? s.palette.trim : shade(s.palette.darkWood, 0.6), light));
  ctx.fillRect(x - 2, y - (boarded ? 3 : 1.5), w + 4, h + (boarded ? 5 : 3));
  if (lit) p.window(x, y, w, h);
  else {
    ctx.fillStyle = css(shade(0x221a13, light));
    ctx.fillRect(x, y, w, h);
  }
}

/** Plank door with a frame, face-local, bottom at the face's foot. */
export function nDoor(p: IsoPainter, s: ArchStyle, x: number, w: number, h: number, color: number, light: number): void {
  const ctx = p.ctx;
  ctx.fillStyle = css(shade(nordic(s).walls === 'boards' ? s.palette.trim : 0x2a2018, light));
  ctx.fillRect(x - 2, -h - 2, w + 4, h + 2);
  ctx.fillStyle = css(shade(color, light));
  ctx.fillRect(x, -h, w, h);
  ctx.fillStyle = css(shade(color, light * 0.62));
  for (let i = 1; i < 3; i++) ctx.fillRect(x + (w * i) / 3, -h + 2, 0.8, h - 2);
}

/**
 * Storehouse on stilts (aitta): a small log or boarded store on four
 * short stumps with a stone on each, under the age's roof, a plank door
 * on its gable. Returns its roof top.
 */
export function aitta(p: IsoPainter, s: ArchStyle, b: Block, axis: 'u' | 'v' = 'u', legs = 12): number {
  const [u0, v0, u1, v1] = b;
  for (const [u, v] of [[u0 + 0.05, v1 - 0.05], [u1 - 0.05, v1 - 0.05], [u1 - 0.05, v0 + 0.05]] as const) {
    p.box(u - 0.05, v - 0.05, u + 0.05, v + 0.05, 0, 3, { color: s.palette.stone }, s.palette.stone);
    post(p, u, v, 3, legs, 3, s.palette.timber);
  }
  const top = legs + 26;
  wallBlock(p, s, b, legs, top, axis === 'v' ? (w) => nDoor(p, s, w / 2 - 5, 10, 18, s.palette.doors.work, 1) : undefined, axis === 'u' ? (w) => nDoor(p, s, w / 2 - 5, 10, 18, s.palette.doors.work, R) : undefined, 0.05);
  return mainRoof(p, s, b, top, axis, { overhang: 0.08 });
}

/** Bark kota: a low conical tent of poles and spruce bark, the poles crossing above its smoke hole. */
export function kota(p: IsoPainter, u: number, v: number, r: number, h: number, bark: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  const rx = r * HW * Math.SQRT2;
  const ry = rx / 2;
  const apex: Pt = [x, y - h];
  const outline: Pt[] = [[x - rx, y], apex, [x + rx, y]];
  for (let i = 1; i < 8; i++) {
    const a = (i / 8) * Math.PI;
    outline.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]);
  }
  const g = ctx.createLinearGradient(x - rx, 0, x + rx, 0);
  g.addColorStop(0, css(shade(bark, 1.18)));
  g.addColorStop(0.5, css(shade(bark, 0.95)));
  g.addColorStop(1, css(shade(bark, 0.6)));
  p.fillPoly(outline, g);
  p.normals.cylinderPoly(outline, x - rx, rx * 2);
  // Bark sheets in courses, pole lines down to the ground.
  ctx.save();
  p.fillPoly(outline, 'rgba(0,0,0,0)');
  ctx.clip();
  ctx.strokeStyle = css(shade(bark, 0.55), 0.7);
  ctx.lineWidth = 0.9;
  for (let t = 0.25; t < 1; t += 0.22) {
    ctx.beginPath();
    ctx.ellipse(x, y - h * (1 - t), rx * t, ry * t, 0, 0, Math.PI);
    ctx.stroke();
  }
  for (let i = 1; i < 8; i++) {
    const a = (i / 8) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(apex[0], apex[1]);
    ctx.lineTo(x + Math.cos(a) * rx, y + Math.sin(a) * ry);
    ctx.stroke();
  }
  // Low door flap.
  ctx.fillStyle = css(shade(bark, 0.45));
  ctx.beginPath();
  ctx.moveTo(x - rx * 0.32, y + ry * 0.92);
  ctx.lineTo(x - rx * 0.22, y + ry * 0.92 - h * 0.34);
  ctx.lineTo(x - rx * 0.06, y + ry * 0.96);
  ctx.fill();
  ctx.restore();
  // Pole ends crossing above the smoke hole.
  ctx.strokeStyle = '#4a3a2a';
  ctx.lineWidth = 1.6;
  for (const dx of [-5, -1.5, 2.5, 5.5]) {
    ctx.beginPath();
    ctx.moveTo(x - dx * 0.4, y - h + 6);
    ctx.lineTo(x + dx, y - h - 9);
    ctx.stroke();
  }
  p.addVolumePoint(u, v, h + 8);
  for (const [du, dv] of [[-r, 0], [0, -r], [r, 0], [0, r]] as const) p.addVolumePoint(u + du, v + dv, 0);
}

/** Hay-drying rack (haasia): posts with rails along a line, hay hung over them in a fuzzy band. */
export function haasia(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, h: number): void {
  const ctx = p.ctx;
  const n = Math.max(2, Math.round(Math.hypot(u1 - u0, v1 - v0) / 0.3));
  for (let i = 0; i <= n; i++) post(p, u0 + ((u1 - u0) * i) / n, v0 + ((v1 - v0) * i) / n, 0, h + 3, 1.3, 0x5a4a38);
  const a = p.p(u0, v0, h);
  const b = p.p(u1, v1, h);
  const band: Pt[] = [[a[0], a[1] - 2], [b[0], b[1] - 2], [b[0], b[1] + h * 0.62], [a[0], a[1] + h * 0.62]];
  const g = ctx.createLinearGradient(0, a[1] - 2, 0, a[1] + h * 0.62);
  g.addColorStop(0, '#c9b46a');
  g.addColorStop(1, '#8c7a3e');
  p.fillPoly(band, g);
  p.normals.fill(band, Math.abs(u1 - u0) > Math.abs(v1 - v0) ? N_LEFT : N_RIGHT);
  ctx.strokeStyle = 'rgba(80,64,26,.55)';
  ctx.lineWidth = 0.8;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  for (let i = 0; i < len / 2.2; i++) {
    const t = p.random();
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    ctx.beginPath();
    ctx.moveTo(x, y - 2);
    ctx.lineTo(x + (p.random() - 0.5) * 2, y + h * (0.45 + p.random() * 0.25));
    ctx.stroke();
  }
  p.addVolumePoint(u0, v0, h);
  p.addVolumePoint(u1, v1, h);
}

/** Slanted pole fence (riukuaita): pairs of uprights with long poles laid aslant between them. */
export function riukuaita(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, h = 13): void {
  const ctx = p.ctx;
  const n = Math.max(2, Math.round(Math.hypot(u1 - u0, v1 - v0) / 0.22));
  ctx.strokeStyle = '#8c7a62';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < n; i++) {
    const t0 = i / n;
    const t1 = (i + 1.6) / n;
    const a = p.p(u0 + (u1 - u0) * t0, v0 + (v1 - v0) * t0, 1);
    const b = p.p(u0 + (u1 - u0) * Math.min(1, t1), v0 + (v1 - v0) * Math.min(1, t1), h);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  for (let i = 0; i <= n; i += 2) post(p, u0 + ((u1 - u0) * i) / n, v0 + ((v1 - v0) * i) / n, 0, h + 3, 1.1, 0x5e5040);
  p.addVolumePoint(u0, v0, h);
  p.addVolumePoint(u1, v1, h);
}

/** Granite boulders scattered over a rectangle (a cairn foot, a field edge). */
export function boulders(p: IsoPainter, s: ArchStyle, u0: number, v0: number, u1: number, v1: number, n: number, size: number, z = 0): void {
  const ctx = p.ctx;
  for (let i = 0; i < n; i++) {
    const [x, y] = p.p(u0 + p.random() * (u1 - u0), v0 + p.random() * (v1 - v0), z);
    const r = size * (0.6 + p.random() * 0.6);
    const pts: Pt[] = [[x - r, y], [x - r * 0.7, y - r * 0.9], [x + r * 0.2, y - r * 1.1], [x + r, y - r * 0.4], [x + r * 0.9, y + r * 0.2], [x - r * 0.4, y + r * 0.35]];
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    g.addColorStop(0, css(shade(s.palette.stone, 1.18)));
    g.addColorStop(1, css(shade(s.palette.stone, 0.62)));
    p.fillPoly(pts, g);
    p.normals.cylinderPoly(pts, x - r, r * 2);
  }
  p.addVolumePoint((u0 + u1) / 2, (v0 + v1) / 2, z + size);
}

/** Round lime-wood shield in the team colour with a white boss rim, face-local. */
export function roundShield(p: IsoPainter, x: number, y: number, r: number, team: number, light: number): void {
  const ctx = p.ctx;
  ctx.fillStyle = css(shade(0x6a5236, light));
  ctx.beginPath();
  ctx.ellipse(x, y, r + 1.2, r + 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(shade(team, light));
  ctx.beginPath();
  ctx.ellipse(x, y, r, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(shade(0xd8d4cc, light));
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.3, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** A tall pole with a ball finial carrying the team banner (the yard's flagstaff). */
export function flagstaff(p: IsoPainter, u: number, v: number, z: number, h: number, team: number): void {
  p.flag(u, v, z, h, team, true);
  p.addVolumePoint(u, v, z + h);
}
