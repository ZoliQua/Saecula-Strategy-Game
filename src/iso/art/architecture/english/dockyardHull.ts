import type { IsoPainter } from '../../isoPainter';
import { N_LEFT, N_RIGHT } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';

type Pt = readonly [number, number];

/*
 * The ship on the Royal Dockyard's slip (M17): a hull in frame, its keel
 * on building blocks along u, the stern half planked and the bow still a
 * cage of bare ribs, a stem post rising at the bow and a transom at the
 * stern, propped by shores. Painted back to front: blocks, the far side's
 * planking (seen from inside) and ribs, the keel and posts, then the near
 * side's planking, ribs, ribbands and shores.
 */

/** Fresh oak of the frames and planking (the same in every age: a ship is built of new timber). */
export const OAK = 0xa8763f;
const FRAME = 0x8a5c30;

export interface Hull {
  /** Stern and bow ends of the keel (u), the centre line (v). */
  readonly u0: number;
  readonly u1: number;
  readonly vc: number;
  /** Greatest half beam (tiles) and the depth of hold (art px). */
  readonly half: number;
  readonly depth: number;
  /** Keel height at the stern and at the bow (the slip falls towards the bow). */
  readonly keelStern: number;
  readonly keelBow: number;
  /** How far towards the bow (0–1 of the length) the planking reaches, and how far up the frames (0–1). */
  readonly planked: number;
  readonly plankedUp: number;
}

const RIBS = 11;
const STEPS = 9;

const lengthAt = (h: Hull, t: number): number => h.u0 + (h.u1 - h.u0) * t;
const keelAt = (h: Hull, t: number): number => h.keelStern + (h.keelBow - h.keelStern) * t;

/** Half beam at t along the keel: a square-ish stern, the widest point aft of midships, a fine bow. */
function halfAt(h: Hull, t: number): number {
  const d = (t - 0.38) / (t < 0.38 ? 0.62 : 0.62);
  return Math.max(0.015, h.half * (1 - d * d));
}

/** Depth of the frame at t: the sheer rises towards the bow and a little at the stern. */
function depthAt(h: Hull, t: number): number {
  return h.depth + 10 * t * t + 5 * (1 - t) ** 3;
}

/** A point on the frame at t (along the keel), q (0 keel → 1 sheer), side ±1. */
function framePoint(p: IsoPainter, h: Hull, t: number, q: number, side: 1 | -1): Pt {
  const a = q * (Math.PI / 2);
  const v = h.vc + side * halfAt(h, t) * Math.sin(a) ** 0.7;
  return p.p(lengthAt(h, t), v, keelAt(h, t) + depthAt(h, t) * (1 - Math.cos(a)));
}

function stroke(p: IsoPainter, pts: readonly Pt[], color: number, width: number): void {
  const ctx = p.ctx;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = css(shade(color, 0.55));
  ctx.lineWidth = width + 1.2;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke();
  ctx.strokeStyle = css(color);
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  const xs = pts.map((q) => q[0]);
  p.normals.cylinderStroke([pts], width + 1.2, Math.min(...xs) - width, Math.max(...xs) - Math.min(...xs) + width * 2);
}

/** One side's half frame at t, from the keel to the sheer. */
function rib(p: IsoPainter, h: Hull, t: number, side: 1 | -1, from = 0): Pt[] {
  return [...Array(STEPS + 1).keys()].map((k) => framePoint(p, h, t, from + (1 - from) * (k / STEPS), side));
}

/** The planked shell of one side between the stern and `planked`, up to `plankedUp` of the frame. */
function planking(p: IsoPainter, h: Hull, side: 1 | -1, light: number): void {
  const ctx = p.ctx;
  const n = 14;
  const ts = [...Array(n + 1).keys()].map((k) => (k / n) * h.planked);
  const upper = ts.map((t) => framePoint(p, h, t, h.plankedUp, side));
  const lower = [...ts].reverse().map((t) => framePoint(p, h, t, 0, side));
  const pts = [...upper, ...lower];
  const ys = pts.map((q) => q[1]);
  const g = ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
  g.addColorStop(0, css(shade(OAK, light * 1.08)));
  g.addColorStop(1, css(shade(OAK, light * 0.7)));
  p.fillPoly(pts, g);
  p.normals.fill(pts, side > 0 ? N_LEFT : N_RIGHT);
  // Strakes: seams along the hull, a few planks darker.
  ctx.save();
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.clip();
  for (let s = 1; s < 7; s++) {
    const q = (s / 7) * h.plankedUp;
    const seam = ts.map((t) => framePoint(p, h, t, q, side));
    ctx.strokeStyle = css(shade(OAK, light * 0.55), 0.75);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    seam.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  }
  ctx.restore();
  p.strokePoly(pts, css(shade(OAK, 0.4), 0.7), 1);
}

/** The building blocks (stocks) under the keel along the slip. */
export function stocks(p: IsoPainter, h: Hull, color: number): void {
  for (let k = 0; k <= 6; k++) {
    const t = 0.04 + (k / 6) * 0.9;
    const u = lengthAt(h, t);
    const top = keelAt(h, t);
    p.box(u - 0.06, h.vc - 0.1, u + 0.06, h.vc + 0.1, 0, top, { color, detail: 'planks' }, color);
  }
}

/** Far side: planking seen from inside, then the far half frames. */
export function hullFar(p: IsoPainter, h: Hull): void {
  planking(p, h, -1, 0.62);
  for (let i = 0; i < RIBS; i++) stroke(p, rib(p, h, (i + 0.5) / RIBS, -1), shade(FRAME, 0.8), 2.6);
}

/** Keel, the stem post curving up at the bow, the sternpost and the transom frame. */
export function hullSpine(p: IsoPainter, h: Hull): void {
  const keel = [...Array(9).keys()].map((k) => p.p(lengthAt(h, k / 8), h.vc, keelAt(h, k / 8)));
  stroke(p, keel, FRAME, 4.2);
  const bow = depthAt(h, 1) + 14;
  const stem: Pt[] = [...Array(9).keys()].map((k) => {
    const a = (k / 8) * (Math.PI / 2);
    return p.p(h.u1 + 0.22 * Math.sin(a), h.vc, h.keelBow + bow * (1 - Math.cos(a)));
  });
  stroke(p, stem, FRAME, 4);
  const sternTop = keelAt(h, 0) + depthAt(h, 0) + 6;
  stroke(p, [p.p(h.u0, h.vc, keelAt(h, 0)), p.p(h.u0 - 0.06, h.vc, sternTop)], FRAME, 4);
  const w = halfAt(h, 0);
  stroke(p, [p.p(h.u0 - 0.04, h.vc - w, sternTop - 8), p.p(h.u0 - 0.04, h.vc + w, sternTop - 8)], FRAME, 3);
}

/** Near side: planking, the bare half frames above and ahead of it, the ribbands along the sheer. */
export function hullNear(p: IsoPainter, h: Hull): void {
  planking(p, h, 1, 1);
  for (let i = 0; i < RIBS; i++) {
    const t = (i + 0.5) / RIBS;
    stroke(p, rib(p, h, t, 1, t <= h.planked ? h.plankedUp : 0), FRAME, 2.8);
  }
  for (const side of [-1, 1] as const) {
    for (const q of [1, 0.82]) {
      const band = [...Array(15).keys()].map((k) => framePoint(p, h, (k / 14) * 0.97, q, side));
      stroke(p, band, side > 0 ? OAK : shade(OAK, 0.75), q === 1 ? 2.4 : 1.6);
    }
  }
  for (const t of [0.12, 0.88]) p.addVolumePoint(lengthAt(h, t), h.vc, keelAt(h, t) + depthAt(h, t));
}

/** Raking shores propping the hull: from the slip to the turn of the bilge, one side. */
export function shores(p: IsoPainter, h: Hull, side: 1 | -1, color: number): void {
  for (const t of [0.22, 0.5, 0.78]) {
    const top = framePoint(p, h, t, 0.55, side);
    const u = lengthAt(h, t);
    const foot = p.p(u, h.vc + side * (halfAt(h, t) + 0.32), 0);
    stroke(p, [foot, top], color, 2.4);
  }
}
