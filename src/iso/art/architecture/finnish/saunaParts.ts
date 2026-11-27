import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { N_UP } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import { post } from '../parts';

type Pt = readonly [number, number];

/*
 * Parts of the Finnish sauna (Szauna): the pond with its shore and
 * reeds, the plank jetty on posts with its ladder, a birch, the birch
 * whisks (vihta) hung on the wall, the bench and bucket, and the static
 * wisp of steam (löyly) from the open door.
 */

const WATER = 0x2f6f9a;
const SHORE = 0x8f7f5c;

/** Outline of the pond round (uc, vc): radii ru, rv tiles, a gently irregular rim. */
function rim(p: IsoPainter, uc: number, vc: number, ru: number, rv: number, k: number, z = 0): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const wob = 1 + 0.07 * Math.sin(a * 3 + 0.6) + 0.05 * Math.cos(a * 5);
    pts.push(p.p(uc + Math.cos(a) * ru * wob * k, vc + Math.sin(a) * rv * wob * k, z));
  }
  return pts;
}

/** The pond: a sandy shore, the dark water with a lighter shallow ring and a few glints, reeds at the back edge. */
export function pond(p: IsoPainter, uc: number, vc: number, ru: number, rv: number): void {
  const shore = rim(p, uc, vc, ru, rv, 1.12);
  p.fillPoly(shore, css(SHORE));
  p.normals.fill(shore, N_UP);
  const shallow = rim(p, uc, vc, ru, rv, 1);
  p.fillPoly(shallow, css(shade(WATER, 1.25)));
  const deep = rim(p, uc, vc, ru, rv, 0.82);
  const [cx, cy] = p.p(uc, vc, 0);
  const g = p.ctx.createRadialGradient(cx, cy, 2, cx, cy, ru * 90);
  g.addColorStop(0, css(shade(WATER, 0.8)));
  g.addColorStop(1, css(WATER));
  p.fillPoly(deep, g);
  const ctx = p.ctx;
  ctx.strokeStyle = 'rgba(220,240,255,.45)';
  ctx.lineWidth = 1;
  for (const [du, dv, l] of [[-0.2, -0.1, 7], [0.15, 0.12, 9], [0.0, 0.3, 6], [0.3, -0.2, 5]] as const) {
    const [x, y] = p.p(uc + du * ru, vc + dv * rv, 0);
    ctx.beginPath();
    ctx.moveTo(x - l, y);
    ctx.lineTo(x + l, y);
    ctx.stroke();
  }
}

/** A clump of reeds at (u, v). */
export function reeds(p: IsoPainter, u: number, v: number, n = 7): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  for (let i = 0; i < n; i++) {
    const dx = (i - n / 2) * 1.6;
    const h = 10 + ((i * 7) % 5) * 1.6;
    ctx.strokeStyle = i % 2 ? '#7d8a3c' : '#5f7030';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x + dx, y);
    ctx.quadraticCurveTo(x + dx + 0.5, y - h * 0.6, x + dx + (i % 3) - 1, y - h);
    ctx.stroke();
    if (i % 3 === 0) {
      ctx.fillStyle = '#6a4a2a';
      ctx.fillRect(x + dx + (i % 3) - 2, y - h - 1, 2, 4);
    }
  }
}

/**
 * Plank jetty along v from v0 to v1 at u0..u1, its deck at z on posts
 * standing in the water, with a ladder at the far end.
 */
export function jetty(p: IsoPainter, u0: number, u1: number, v0: number, v1: number, z: number, wood: number): void {
  const ctx = p.ctx;
  for (const v of [v0 + 0.25, (v0 + v1) / 2 + 0.1, v1 - 0.04]) {
    for (const u of [u0 + 0.03, u1 - 0.03]) post(p, u, v, -2, z, 2, shade(wood, 0.7));
  }
  p.box(u0, v0, u1, v1, z - 2.5, z, { color: wood, detail: 'planks' }, shade(wood, 1.1));
  // Plank joints across the deck.
  ctx.strokeStyle = css(shade(wood, 0.65), 0.7);
  ctx.lineWidth = 0.7;
  for (let v = v0 + 0.06; v < v1; v += 0.06) {
    const a = p.p(u0, v, z);
    const b = p.p(u1, v, z);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  // The ladder down into the water.
  const [lx, ly] = p.p((u0 + u1) / 2, v1, z);
  ctx.strokeStyle = '#b8b2a6';
  ctx.lineWidth = 1.2;
  for (const dx of [-3.5, 3.5]) {
    ctx.beginPath();
    ctx.moveTo(lx + dx, ly - 4);
    ctx.lineTo(lx + dx, ly + 8);
    ctx.stroke();
  }
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(lx - 3.5, ly + k * 3.5);
    ctx.lineTo(lx + 3.5, ly + k * 3.5);
    ctx.stroke();
  }
}

/** A birch at (u, v): a slim white trunk with black lenticels, a light, airy crown. */
export function birch(p: IsoPainter, u: number, v: number, h: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  ctx.fillStyle = '#ece8df';
  ctx.beginPath();
  ctx.moveTo(x - 2, y);
  ctx.lineTo(x - 1, y - h);
  ctx.lineTo(x + 1, y - h);
  ctx.lineTo(x + 2, y);
  ctx.closePath();
  ctx.fill();
  p.normalCylinder(x - 2, y - h, 4, h);
  ctx.fillStyle = '#2a2622';
  for (let z = 4; z < h - 6; z += 5) ctx.fillRect(x - 1.6 + ((z * 3) % 2), y - z, 2 + (z % 3) * 0.4, 0.9);
  const blobs: Array<readonly [number, number, number]> = [[0, -h - 2, 9], [-7, -h + 6, 7], [7, -h + 5, 7], [-3, -h + 14, 6], [5, -h + 13, 6], [0, -h + 8, 8]];
  for (const [dx, dy, r] of blobs) {
    ctx.fillStyle = '#5f8a34';
    ctx.beginPath();
    ctx.arc(x + dx + 1, y + dy + 1.5, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const [dx, dy, r] of blobs) {
    ctx.fillStyle = '#8fb54c';
    ctx.beginPath();
    ctx.arc(x + dx - 1, y + dy - 1, r * 0.72, 0, Math.PI * 2);
    ctx.fill();
  }
  p.normalCylinder(x - 15, y - h - 12, 30, 28);
  p.addVolumePoint(u, v, h + 8);
}

/** Birch whisks (vihta) hung on pegs (face-local): leafy bundles bound at the handle. */
export function whisks(ctx: Ctx, x: number, y: number, n: number, light: number): void {
  for (let i = 0; i < n; i++) {
    const cx = x + i * 7;
    ctx.fillStyle = css(shade(0x3a2a1c, light));
    ctx.fillRect(cx - 0.7, y - 2, 1.4, 3);
    ctx.fillStyle = css(shade(0xc8b48a, light));
    ctx.fillRect(cx - 1.4, y + 1, 2.8, 4);
    ctx.fillStyle = css(shade(0x4f7a2c, light));
    ctx.beginPath();
    ctx.ellipse(cx, y + 10, 3.4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(shade(0x7fa846, light));
    for (const [dx, dy] of [[-1.5, 7], [1.2, 9], [-0.6, 12], [1, 14]] as const) ctx.fillRect(cx + dx, y + dy, 1.6, 1.6);
  }
}

/** A plank bench along u at v (u0..u1) with a wooden bucket (kiulu) and ladle on it. */
export function bench(p: IsoPainter, u0: number, u1: number, v: number, wood: number): void {
  const ctx = p.ctx;
  for (const u of [u0 + 0.04, u1 - 0.04]) post(p, u, v, 0, 7, 1.6, shade(wood, 0.7));
  p.box(u0, v - 0.05, u1, v + 0.05, 7, 9, { color: wood }, shade(wood, 1.15));
  const [x, y] = p.p(u1 - 0.12, v, 9);
  ctx.fillStyle = '#9a6a3a';
  ctx.fillRect(x - 3, y - 6, 6, 6);
  ctx.fillStyle = '#5a3a20';
  ctx.fillRect(x - 3, y - 4.5, 6, 0.9);
  ctx.fillRect(x - 3, y - 1.5, 6, 0.9);
  ctx.fillStyle = '#3c6f8e';
  ctx.beginPath();
  ctx.ellipse(x, y - 6, 3, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a5530';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 1, y - 6);
  ctx.lineTo(x + 5, y - 13);
  ctx.stroke();
  p.addVolumePoint(u1 - 0.12, v, 15);
}

/** A static wisp of steam rising and curling from screen point (x, y). */
export function steamWisp(ctx: Ctx, x: number, y: number, h: number, drift: number): void {
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const cx = x + Math.sin(t * 3.2) * 4 + drift * t;
    const cy = y - t * h;
    const r = 3 + t * 6;
    const g = ctx.createRadialGradient(cx, cy, 0.5, cx, cy, r);
    g.addColorStop(0, `rgba(246,246,242,${0.55 - t * 0.35})`);
    g.addColorStop(1, 'rgba(246,246,242,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Open woodshed (liiteri) on b: a back wall of logs, birch firewood
 * stacked end-on to the front between two posts, under a shingled gable.
 */
export function woodshed(p: IsoPainter, b: readonly [number, number, number, number], h: number, wall: number, roof: number): void {
  const [u0, v0, u1, v1] = b;
  const ctx = p.ctx;
  p.box(u0, v0, u1, v1, 0, h - 4, { color: shade(0x8a6a48, 0.9) }, 0x8a6a48);
  p.leftFace(u0, u1, v1, 0, (w, fh) => {
    for (let y = 3; y < fh - 1; y += 6) {
      for (let x = 3 + ((y / 6) % 2) * 2.5; x < w - 2; x += 5.2) {
        ctx.fillStyle = (x + y) % 3 < 1 ? '#e2cfa6' : '#d4b98a';
        ctx.beginPath();
        ctx.ellipse(x, -y, 2.5, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(232,228,218,.9)';
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
    }
  }, h - 4);
  for (const u of [u0 + 0.02, u1 - 0.02]) post(p, u, v1 + 0.02, 0, h, 2.2, wall);
  const prev = p.material;
  p.material = 'shingle';
  p.gableRoof(u0, v0, u1, v1, h, 16, roof, wall, 'v', 0.07);
  p.material = prev;
}

/** A tarred rowboat (soutuvene) lying along v on the water at (u, v). */
export function rowboat(p: IsoPainter, u: number, v: number, wood: number): void {
  const ctx = p.ctx;
  const L = 0.3;
  const W = 0.08;
  const hull: Pt[] = [p.p(u, v - L, 3), p.p(u + W, v - L * 0.4, 2), p.p(u + W, v + L * 0.5, 2), p.p(u, v + L, 3.5), p.p(u - W, v + L * 0.5, 2), p.p(u - W, v - L * 0.4, 2)];
  const keel: Pt[] = hull.map(([x, y]) => [x, y + 4] as const);
  p.fillPoly(keel, css(shade(0x2a2420, 1)));
  p.fillPoly(hull, css(shade(wood, 0.95)));
  p.normals.fill(hull, N_UP);
  const inner: Pt[] = [p.p(u, v - L * 0.8, 2), p.p(u + W * 0.7, v - L * 0.3, 1.5), p.p(u + W * 0.7, v + L * 0.4, 1.5), p.p(u, v + L * 0.8, 2.5), p.p(u - W * 0.7, v + L * 0.4, 1.5), p.p(u - W * 0.7, v - L * 0.3, 1.5)];
  p.fillPoly(inner, css(shade(wood, 0.6)));
  ctx.strokeStyle = css(shade(wood, 1.2));
  ctx.lineWidth = 1.2;
  for (const t of [-0.25, 0.2]) {
    const a = p.p(u - W * 0.7, v + L * t, 2.5);
    const b = p.p(u + W * 0.7, v + L * t, 2.5);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  p.addVolumePoint(u, v, 5);
}
