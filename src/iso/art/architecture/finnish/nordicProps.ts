import { HW, type IsoPainter } from '../../isoPainter';
import { baked } from '../../lighting/normalLayer';
import { N_LEFT, N_RIGHT, N_UP } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import { turfMound } from '../kits/turfRoof';
import { post } from '../parts';
import type { ArchStyle } from '../style';
import { towerLine } from '../towerParts';
import { mainRoof, wallBlock, type Block } from './nordicParts';

type Pt = readonly [number, number];

/*
 * The trades of the Finnish workplaces, each a tall cue of its own on
 * the skyline: the tar pit's smoking turf mound and barrels, the clay
 * bloomery of bog iron, the post mill, the shear-leg log hoist, the
 * stone furnace with its charging bridge, the water wheel, the shooting
 * guild's popinjay mast, the meadow barn (lato) with flared walls, the
 * whim house and headframe over a shaft, and a fieldstone stack.
 */

const IRON = 0x3a3836;

/** Tar pit (tervahauta): a smoking turf mound over the pine charge, a tar spout and barrels. */
export function tarPit(p: IsoPainter, u: number, v: number, r: number, h: number, turf: number): void {
  turfMound(p, u, v, r, h, turf);
  const ctx = p.ctx;
  // Tar runs out of the spout at the mound's foot into a trough.
  const [x, y] = p.p(u + r * 0.7, v + r * 0.7, 0);
  ctx.fillStyle = '#16110c';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 7, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  p.addSmoke(u, v, h);
  p.addSmoke(u - r * 0.4, v + r * 0.2, h * 0.7);
}

/** Tar barrels stacked in a little pyramid at (u, v). */
export function barrels(p: IsoPainter, u: number, v: number, n: number): void {
  const ctx = p.ctx;
  const [x0, y0] = p.p(u, v, 0);
  let i = 0;
  for (let row = 0; i < n; row++) {
    for (let k = 0; k < 3 - row && i < n; k++, i++) {
      const x = x0 + k * 11 + row * 5.5;
      const y = y0 - row * 13 - k * 1.5;
      const g = ctx.createLinearGradient(x - 5, 0, x + 5, 0);
      g.addColorStop(0, '#6a4a2c');
      g.addColorStop(1, '#2e2016');
      ctx.fillStyle = g;
      ctx.fillRect(x - 5, y - 13, 10, 13);
      ctx.fillStyle = '#1b1510';
      ctx.fillRect(x - 5, y - 10, 10, 1.2);
      ctx.fillRect(x - 5, y - 4, 10, 1.2);
      p.normalCylinder(x - 5, y - 13, 10, 13);
    }
  }
  p.addVolumePoint(u, v, 26);
}

/** Clay shaft furnace for bog iron: a tapering clay chimney on a stone foot with its tuyere and bellows. */
export function bloomery(p: IsoPainter, u: number, v: number, h: number, r0 = 15): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  const r1 = r0 * 0.47;
  const pts: Pt[] = [[x - r0, y], [x - r1, y - h], [x + r1, y - h], [x + r0, y]];
  const g = ctx.createLinearGradient(x - r0, 0, x + r0, 0);
  g.addColorStop(0, '#b98a5c');
  g.addColorStop(0.5, '#9a6e44');
  g.addColorStop(1, '#5e4028');
  p.fillPoly(pts, g);
  p.normals.cylinderPoly(pts, x - r0, r0 * 2);
  ctx.fillStyle = 'rgba(40,26,14,.45)';
  for (let k = 8; k < h; k += 9) ctx.fillRect(x - r0 + (k / h) * (r0 - r1), y - k, (r0 - (k / h) * (r0 - r1)) * 2, 1.2);
  ctx.fillStyle = '#1d1510';
  ctx.beginPath();
  ctx.ellipse(x, y - h, r1, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 3.5, y - 10, 7, 7);
  // Bellows of hide beside the tuyere.
  ctx.fillStyle = '#7a5a3c';
  ctx.beginPath();
  ctx.ellipse(x + r0 + 5, y - 5, 6, 3.5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  p.addVolumePoint(u, v, h);
  p.addSmoke(u, v, h);
}

/**
 * Post mill (pukkimylly): the boarded mill body on a trestle and king
 * post, turned to the wind by its tail pole, four lattice sails on the
 * lit face. `z` is the body's floor.
 */
export function postMill(p: IsoPainter, s: ArchStyle, u: number, v: number, z: number, team: number): number {
  const c = s.palette;
  const ctx = p.ctx;
  // Trestle: crossed quarter bars on stone piers, the king post rising to the body.
  for (const [du, dv] of [[-0.24, 0], [0, -0.24], [0.24, 0], [0, 0.24]] as const) {
    const a = p.p(u + du, v + dv, 0);
    const b = p.p(u, v, z * 0.55);
    p.box(u + du - 0.04, v + dv - 0.04, u + du + 0.04, v + dv + 0.04, 0, 5, { color: c.stone }, c.stone);
    towerLine(p, a, b, shade(c.timber, 0.9), 2.4);
  }
  post(p, u, v, 0, z, 3.2, c.timber);
  // Tail pole down to the ground behind.
  towerLine(p, p.p(u - 0.18, v - 0.1, z + 6), p.p(u - 0.62, v - 0.4, 4), shade(c.timber, 0.85), 2.2);
  const body: Block = [u - 0.2, v - 0.16, u + 0.2, v + 0.16];
  wallBlock(p, s, body, z, z + 40, (w) => {
    ctx.fillStyle = '#1e1610';
    ctx.fillRect(w / 2 - 3, -14, 6, 8);
  });
  const top = mainRoof(p, s, body, z + 40, 'u', { scale: 1.3, overhang: 0.05 });
  // Sails in the +v face's plane: hub, four stocks with lattice frames.
  const hu = u + 0.06;
  const hv = v + 0.17;
  const hz = z + 28;
  const at = (l: number, a: number, off: number): Pt => p.p(hu + (l * Math.cos(a) - off * Math.sin(a)) / 72, hv, hz + l * Math.sin(a) + off * Math.cos(a));
  const hub = at(0, 0, 0);
  const L = 60;
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    towerLine(p, hub, at(L, a, 0), 0x4a3828, 2);
    const q: Pt[] = [at(14, a, 0), at(L, a, 0), at(L, a, 11), at(14, a, 11)];
    p.fillPoly(q, 'rgba(226,214,190,.55)');
    p.normals.fill(q, N_LEFT);
    p.strokePoly(q, '#4a3828', 0.9);
    for (let l = 22; l < L; l += 9) towerLine(p, at(l, a, 0), at(l, a, 11), 0x4a3828, 0.7);
    p.addVolumePoint(hu + (L * Math.cos(a)) / 72, hv, hz + L * Math.sin(a));
  }
  ctx.fillStyle = '#2a2018';
  ctx.beginPath();
  ctx.arc(hub[0], hub[1], 3, 0, Math.PI * 2);
  ctx.fill();
  p.flag(u - 0.14, v - 0.12, top - 2, 16, team);
  return Math.max(top, hz + L);
}

/** Shear-leg log hoist: two raking legs lashed at the head, a back stay, a log hanging on its rope. */
export function shearLegs(p: IsoPainter, s: ArchStyle, u: number, v: number, h: number): void {
  const c = s.palette;
  const head = p.p(u, v, h);
  towerLine(p, p.p(u - 0.34, v + 0.1, 0), head, shade(c.timber, 1.05), 3.4);
  towerLine(p, p.p(u + 0.1, v - 0.34, 0), head, shade(c.timber, 0.8), 3.4);
  towerLine(p, p.p(u - 0.55, v - 0.55, 0), head, 0x3a2e22, 1);
  const hook = p.p(u + 0.12, v + 0.12, h * 0.42);
  towerLine(p, head, hook, 0x2a2018, 1);
  // The hanging log.
  const a = p.p(u - 0.2, v + 0.3, h * 0.36);
  const b = p.p(u + 0.38, v + 0.0, h * 0.36);
  towerLine(p, a, b, shade(c.darkWood, 0.95), 7);
  p.ctx.fillStyle = '#d6b88a';
  p.ctx.beginPath();
  p.ctx.ellipse(b[0], b[1], 2.4, 3.4, 0, 0, Math.PI * 2);
  p.ctx.fill();
  p.addVolumePoint(u, v, h);
}

/**
 * Stone furnace (masuuni): a truncated granite pyramid over u0..u1 ×
 * v0..v1, h high, with a charging bridge running up to its top from the
 * back. Returns the top height.
 */
export function stoneFurnace(p: IsoPainter, s: ArchStyle, b: Block, h: number, inset = 0.14): number {
  const [u0, v0, u1, v1] = b;
  const c = s.palette;
  const top: Block = [u0 + inset, v0 + inset, u1 - inset, v1 - inset];
  // Charging bridge on posts from the back corner up to the top.
  for (const t of [0.25, 0.6]) post(p, u0 - 0.3 + 0.3 * t, v0 + 0.1, 0, h * t, 2.4, c.timber);
  const ramp: Pt[] = [p.p(u0 - 0.36, v0 + 0.02, 0), p.p(top[0], v0 + 0.02, h), p.p(top[0], v0 + 0.26, h), p.p(u0 - 0.36, v0 + 0.26, 0)];
  p.fillPoly(ramp, css(shade(c.planks, 1.0)));
  p.normals.fill(ramp, p.slope(-1, 0, 0.5, h));
  const left: Pt[] = [p.p(u0, v1, 0), p.p(u1, v1, 0), p.p(top[2], top[3], h), p.p(top[0], top[3], h)];
  const right: Pt[] = [p.p(u1, v1, 0), p.p(u1, v0, 0), p.p(top[2], top[1], h), p.p(top[2], top[3], h)];
  p.fillPoly(left, css(shade(c.ashlar, 1)));
  p.normals.fill(left, p.slope(0, 1, inset, h));
  p.fillPoly(right, css(shade(c.ashlar, baked(0.72))));
  p.normals.fill(right, p.slope(1, 0, inset, h));
  const ctx = p.ctx;
  // Granite courses.
  for (const [face, light] of [[left, 1], [right, baked(0.72)]] as const) {
    ctx.save();
    p.fillPoly(face, 'rgba(0,0,0,0)');
    ctx.clip();
    ctx.fillStyle = css(shade(c.ashlar, light * 0.7), 0.6);
    for (let z = 8; z < h; z += 9) {
      const l = p.p(u0, v1, z);
      const r = p.p(u1, v0, z);
      const m = p.p(u1, v1, z);
      towerLine(p, l, m, shade(c.ashlar, light * 0.7), 0.9);
      towerLine(p, m, r, shade(c.ashlar, light * 0.7), 0.9);
    }
    ctx.restore();
  }
  p.strokePoly(left, css(shade(c.ashlar, 0.45), 0.6), 1);
  p.strokePoly(right, css(shade(c.ashlar, 0.35), 0.6), 1);
  // Tapping arch at the foot.
  p.leftFace(u0, u1, v1, 0, (w) => {
    ctx.fillStyle = '#1a130e';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 7, 0);
    ctx.lineTo(w / 2 - 7, -12);
    ctx.arc(w / 2, -12, 7, Math.PI, 0);
    ctx.lineTo(w / 2 + 7, 0);
    ctx.fill();
  }, 26);
  const topPts = [p.p(top[0], top[1], h), p.p(top[2], top[1], h), p.p(top[2], top[3], h), p.p(top[0], top[3], h)];
  p.fillPoly(topPts, css(shade(c.ashlar, 1.08)));
  p.normals.fill(topPts, N_UP);
  for (const [u, v] of [[u0, v0], [u1, v0], [u1, v1], [u0, v1]] as const) p.addVolumePoint(u, v, 0);
  for (const [u, v] of [[top[0], top[1]], [top[2], top[1]], [top[2], top[3]], [top[0], top[3]]] as const) p.addVolumePoint(u, v, h);
  return h;
}

/**
 * Undershot water wheel standing in the u–z plane at v, centre (u, zc),
 * radius r tiles, with its flume on posts coming in from the back.
 */
export function waterWheel(p: IsoPainter, s: ArchStyle, u: number, v: number, zc: number, r: number, flume = 0.85): void {
  const c = s.palette;
  const ctx = p.ctx;
  const rz = r * 72;
  const ring = (dv: number, rr: number) => Array.from({ length: 25 }, (_, k) => {
    const a = (k / 24) * Math.PI * 2;
    return p.p(u + rr * Math.cos(a), v + dv, zc + (rz * rr) / r * Math.sin(a));
  });
  // Flume from the back to the wheel's crown.
  const v0 = v - 0.05 - flume;
  for (const t of [0.2, 0.65]) post(p, u - 0.06, v0 + t * flume, 0, zc + rz + 4, 2.2, c.timber);
  const trough: Pt[] = [p.p(u - 0.16, v0, zc + rz + 8), p.p(u + 0.04, v0, zc + rz + 8), p.p(u + 0.04, v - 0.05, zc + rz + 6), p.p(u - 0.16, v - 0.05, zc + rz + 6)];
  p.fillPoly(trough, css(shade(c.planks, 0.9)));
  p.normals.fill(trough, N_UP);
  p.ctx.fillStyle = 'rgba(120,160,180,.7)';
  p.ctx.fillRect(trough[2]![0] - 2, trough[2]![1], 4, rz * 0.5);
  for (const [dv, light] of [[-0.06, 0.6], [0.06, 1]] as const) {
    const rim = ring(dv, r);
    ctx.strokeStyle = css(shade(c.timber, light));
    ctx.lineWidth = 3;
    ctx.beginPath();
    rim.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
    p.normals.cylinderStroke([rim], 3, Math.min(...rim.map((q) => q[0])), r * HW * 2);
  }
  // Paddles and spokes.
  const hub = p.p(u, v + 0.06, zc);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const o = p.p(u + r * Math.cos(a), v + 0.06, zc + rz * Math.sin(a));
    const i = p.p(u + r * Math.cos(a), v - 0.06, zc + rz * Math.sin(a));
    towerLine(p, o, i, shade(c.planks, 0.85), 3);
    if (k % 2 === 0) towerLine(p, hub, o, shade(c.timber, 0.9), 1.6);
  }
  ctx.fillStyle = css(IRON);
  ctx.beginPath();
  ctx.arc(hub[0], hub[1], 3.2, 0, Math.PI * 2);
  ctx.fill();
  p.addVolumePoint(u, v, zc + rz);
  p.addVolumePoint(u - r, v, zc);
  p.addVolumePoint(u + r, v, zc);
}

/** Popinjay mast of a shooting guild: a tall pole with a wooden bird on top and two cross-arms. */
export function popinjay(p: IsoPainter, u: number, v: number, h: number, team: number): void {
  const ctx = p.ctx;
  post(p, u, v, 0, h, 2.6, 0x5a4634);
  const [x, y] = p.p(u, v, h);
  for (const [z, w] of [[h * 0.62, 14], [h * 0.82, 10]] as const) {
    const [ax, ay] = p.p(u, v, z);
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(ax - w, ay - 1.2, w * 2, 2.4);
  }
  // The bird: body, raised wings, tail, painted in the team colour.
  ctx.fillStyle = css(shade(team, 1.05));
  ctx.beginPath();
  ctx.ellipse(x, y - 6, 4.5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 2, y - 9);
  ctx.lineTo(x - 13, y - 18);
  ctx.lineTo(x - 4, y - 5);
  ctx.moveTo(x + 2, y - 9);
  ctx.lineTo(x + 13, y - 18);
  ctx.lineTo(x + 4, y - 5);
  ctx.fill();
  ctx.fillStyle = '#e8c35a';
  ctx.beginPath();
  ctx.moveTo(x, y - 12);
  ctx.lineTo(x + 3.5, y - 14);
  ctx.lineTo(x, y - 15);
  ctx.fill();
  p.addVolumePoint(u, v, h + 18);
}

/**
 * Meadow barn (lato): a log barn whose walls lean outwards as they rise
 * (each course longer than the one below), under the age's roof.
 */
export function lato(p: IsoPainter, s: ArchStyle, b: Block, h: number, flare = 0.1): number {
  const [u0, v0, u1, v1] = b;
  const c = s.palette;
  const t: Block = [u0 - flare, v0 - flare, u1 + flare, v1 + flare];
  const left: Pt[] = [p.p(u0, v1, 0), p.p(u1, v1, 0), p.p(t[2], t[3], h), p.p(t[0], t[3], h)];
  const right: Pt[] = [p.p(u1, v1, 0), p.p(u1, v0, 0), p.p(t[2], t[1], h), p.p(t[2], t[3], h)];
  for (const [face, light, normal] of [[left, 1, N_LEFT], [right, baked(0.72), N_RIGHT]] as const) {
    p.fillPoly(face, css(shade(c.darkWood, light)));
    p.normals.fill(face, normal);
    const ctx = p.ctx;
    ctx.save();
    p.fillPoly(face, 'rgba(0,0,0,0)');
    ctx.clip();
    for (let z = 7; z < h; z += 7) {
      const k = z / h;
      const a = face === left ? p.p(u0 - flare * k, v1 + flare * k, z) : p.p(u1 + flare * k, v1 + flare * k, z);
      const e = face === left ? p.p(u1 + flare * k, v1 + flare * k, z) : p.p(u1 + flare * k, v0 - flare * k, z);
      towerLine(p, a, e, shade(c.darkWood, light * 0.6), 1.1);
    }
    ctx.restore();
    p.strokePoly(face, css(shade(c.darkWood, 0.4), 0.6), 1.1);
  }
  // Barn door on the lit side.
  p.leftFace(u0, u1, v1, 0, (w) => {
    p.ctx.fillStyle = '#1e1610';
    p.ctx.fillRect(w * 0.36, -h * 0.72, w * 0.28, h * 0.72);
  }, h);
  for (const [u, v] of [[u0, v0], [u1, v0], [u1, v1], [u0, v1]] as const) p.addVolumePoint(u, v, 0);
  return mainRoof(p, s, t, h, 'u', { overhang: 0.06 });
}

/** Timber headframe over a shaft: four raking posts with braces and a pulley wheel at the head. */
export function headframe(p: IsoPainter, s: ArchStyle, u: number, v: number, w: number, h: number): void {
  const c = s.palette;
  const head = (du: number, dv: number) => p.p(u + du * w * 0.45, v + dv * w * 0.45, h);
  const feet: ReadonlyArray<readonly [number, number]> = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (const [du, dv] of feet) towerLine(p, p.p(u + du * w, v + dv * w, 0), head(du, dv), shade(c.timber, du + dv > 0 ? 0.75 : 1.0), 4.2);
  for (const z of [h * 0.35, h * 0.7]) {
    const k = 1 - (z / h) * 0.55;
    towerLine(p, p.p(u - w * k, v + w * k, z), p.p(u + w * k, v + w * k, z), shade(c.timber, 1), 2.6);
    towerLine(p, p.p(u + w * k, v - w * k, z), p.p(u + w * k, v + w * k, z), shade(c.timber, 0.8), 2.6);
  }
  const [x, y] = p.p(u, v, h + 10);
  const ctx = p.ctx;
  ctx.strokeStyle = css(IRON);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(x, y, 7, 11, 0.4, 0, Math.PI * 2);
  ctx.stroke();
  towerLine(p, [x, y], p.p(u, v, 0), 0x2a2622, 0.8);
  p.addVolumePoint(u, v, h + 21);
  for (const [du, dv] of feet) p.addVolumePoint(u + du * w, v + dv * w, 0);
}

/** Fieldstone chimney: rounded granite stones piled into a tapering stack, smoke at the top. */
export function stoneStack(p: IsoPainter, s: ArchStyle, u: number, v: number, z0: number, h: number, r = 0.12): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, z0);
  const rx = r * HW * Math.SQRT2;
  const body: Pt[] = [[x - rx, y], [x - rx * 0.62, y - h], [x + rx * 0.62, y - h], [x + rx, y]];
  p.fillPoly(body, css(shade(s.palette.stone, 0.9)));
  p.normals.cylinderPoly(body, x - rx, rx * 2);
  for (let z = 3; z < h; z += 6) {
    const k = 1 - (z / h) * 0.38;
    for (let i = -2; i <= 2; i++) {
      const sx = x + i * rx * 0.42 * k + (z % 12 === 3 ? rx * 0.2 : 0);
      if (Math.abs(sx - x) > rx * k - 2) continue;
      const g = ctx.createLinearGradient(sx - 3.5, y - z - 3, sx + 3.5, y - z + 3);
      g.addColorStop(0, css(shade(s.palette.stone, 1.2)));
      g.addColorStop(1, css(shade(s.palette.stone, 0.6)));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(sx, y - z, 3.8 * k, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  p.addVolumePoint(u, v, z0 + h);
  p.addSmoke(u, v, z0 + h);
}
