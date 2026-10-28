import type { IsoPainter } from '../../isoPainter';
import { baked } from '../../lighting/normalLayer';
import { N_LEFT, N_RIGHT } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import { crest, R } from '../facade';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { finialPole, izbaWindow, logBlock, oblam, plankGable, stakeRow, type Block } from './izbaParts';

type Pt = readonly [number, number];

/*
 * Russian age-1 town centre: a gorodishche. An earth rampart (val)
 * crowned by a log stockade closes the two back sides; inside stands
 * the tall log watchtower (vezha) with its overhanging fighting gallery
 * and a steep plank hip, the prince's hall with its carved gable to the
 * yard, and a roofed log well.
 */

const SOD = 0x7a8a4a;
const EARTH = 0x7d6646;
const RAMPART = 22;
const TOWER: Block = [0.98, 0.82, 1.68, 1.52];
const HALL: Block = [1.92, 1.05, 2.72, 2.6];

function sod(p: IsoPainter, pts: Pt[], color: number, light: number): void {
  p.fillPoly(pts, css(shade(color, light)));
  const ctx = p.ctx;
  ctx.save();
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.clip();
  const xs = pts.map((q) => q[0]);
  const ys = pts.map((q) => q[1]);
  for (let i = 0; i < 70; i++) {
    const x = Math.min(...xs) + p.random() * (Math.max(...xs) - Math.min(...xs));
    const y = Math.min(...ys) + p.random() * (Math.max(...ys) - Math.min(...ys));
    ctx.fillStyle = css(shade(color, light * (0.75 + p.random() * 0.5)), 0.7);
    ctx.fillRect(x, y, 2, 1.2);
  }
  ctx.restore();
  p.strokePoly(pts, css(shade(color, 0.5), 0.35), 0.8);
}

/** Rampart along u at the back: crest v0..v1 at height h, inner slope down to vFoot. */
function bankU(p: IsoPainter, u0: number, u1: number, v0: number, v1: number, vFoot: number, h: number): void {
  p.ground(u0, v0, u1, v1, shade(SOD, 1.05), h);
  const slope: Pt[] = [p.p(u0, v1, h), p.p(u1, v1, h), p.p(u1, vFoot, 0), p.p(u0, vFoot, 0)];
  sod(p, slope, SOD, baked(1.02));
  p.normals.fill(slope, p.slope(0, 1, vFoot - v1, h));
  const cap: Pt[] = [p.p(u1, v0 - 0.12, 0), p.p(u1, v0, h), p.p(u1, v1, h), p.p(u1, vFoot, 0)];
  sod(p, cap, EARTH, baked(0.72));
  p.normals.fill(cap, N_RIGHT);
  for (const [u, v] of [[u0, v0], [u1, v0], [u1, v1], [u0, v1]] as const) p.addVolumePoint(u, v, h);
}

/** Rampart along v at the back: crest u0..u1 at height h, inner slope down to uFoot. */
function bankV(p: IsoPainter, v0: number, v1: number, u0: number, u1: number, uFoot: number, h: number): void {
  p.ground(u0, v0, u1, v1, shade(SOD, 1.05), h);
  const slope: Pt[] = [p.p(u1, v0, h), p.p(u1, v1, h), p.p(uFoot, v1, 0), p.p(uFoot, v0, 0)];
  sod(p, slope, SOD, baked(0.8));
  p.normals.fill(slope, p.slope(1, 0, uFoot - u1, h));
  const cap: Pt[] = [p.p(u0 - 0.12, v1, 0), p.p(u0, v1, h), p.p(u1, v1, h), p.p(uFoot, v1, 0)];
  sod(p, cap, EARTH, 1);
  p.normals.fill(cap, N_LEFT);
  for (const [u, v] of [[u0, v0], [u1, v0], [u1, v1], [u0, v1]] as const) p.addVolumePoint(u, v, h);
}

/** Log well-house: a low log curb under a little gabled roof on two posts. */
export function wellHouse(p: IsoPainter, s: ArchStyle, u: number, v: number): void {
  const c = s.palette;
  logBlock(p, s, [u, v, u + 0.3, v + 0.3], 0, 16, undefined, undefined, 0.04);
  for (const pv of [v + 0.02, v + 0.28]) {
    const [x, y] = p.p(u + 0.15, pv, 16);
    p.ctx.fillStyle = css(c.timber);
    p.ctx.fillRect(x - 1.2, y - 20, 2.4, 20);
  }
  const prev = p.material;
  p.material = 'shingle';
  p.gableRoof(u + 0.02, v - 0.02, u + 0.28, v + 0.32, 34, 12, c.roof, c.darkWood, 'v', 0.05);
  p.material = prev;
}

function paintHillfort(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0x8a7a5a);
  bankU(p, 0.08, 2.92, 0.12, 0.34, 0.66, RAMPART);
  bankV(p, 0.34, 2.92, 0.12, 0.34, 0.66, RAMPART);
  stakeRow(p, 0.2, 0.22, 2.9, 0.22, RAMPART, 30, c.darkWood);
  stakeRow(p, 0.22, 0.3, 0.22, 2.9, RAMPART, 30, c.darkWood);
  // The watchtower.
  logBlock(p, s, TOWER, 0, 114, (w, h) => {
    p.door(w / 2 - 6, 12, 24, c.doors.gate);
    izbaWindow(p, s, w / 2 - 4, -h + 22, 7, 9, 1);
    crest(p.ctx, s, w / 2, -h * 0.5, 9, team);
  }, (w, h) => izbaWindow(p, s, w / 2 - 4, -h + 22, 7, 9, R, false));
  const g = oblam(p, s, TOWER, 114, 20);
  p.material = 'shingle';
  p.hipRoof(g[0], g[1], g[2], g[3], 134, 66, c.roof, 0.06);
  finialPole(p, 1.33, 1.17, 200);
  p.flag(1.33, 1.17, 206, 26, team, true);
  // The prince's hall.
  p.box(HALL[0] - 0.02, HALL[1] - 0.02, HALL[2] + 0.02, HALL[3] + 0.02, 0, 7, { color: c.stone, detail: 'fieldstone' }, c.stone);
  logBlock(p, s, HALL, 7, 52, (w, h) => {
    for (const x of [0.2, 0.62]) izbaWindow(p, s, w * x, -h + 16, 9, 11, 1);
  }, (w, h) => {
    for (const x of [0.15, 0.68]) izbaWindow(p, s, w * x, -h + 16, 9, 11, R, x < 0.5);
    p.door(w * 0.42, 13, 26, c.doors.main);
  });
  plankGable(p, s, HALL, 52, 62, 'v', { window: true });
  wellHouse(p, s, 0.7, 2.15);
}

/** The Russian age-1 town centre: a log hillfort on its rampart. */
export function hillfort(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 250, paint: (p, team) => paintHillfort(p, s, team) };
}
