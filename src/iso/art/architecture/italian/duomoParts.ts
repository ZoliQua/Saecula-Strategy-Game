import type { Ctx } from '../../canvas';
import { HW, type IsoPainter } from '../../isoPainter';
import { baked } from '../../lighting/normalLayer';
import { normalize, slopeNormal, SCREEN_PER_WORLD_HEIGHT, tileToView } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import { finial } from '../roofs';

type Pt = readonly [number, number];

/*
 * Pieces of the Florentine Duomo: the white, green and pink marble
 * incrustation of its walls, the octagonal drum with its oculi, the
 * octagonal ribbed terracotta dome with white marble ribs, and the
 * marble lantern. Octagons stand with a face towards the viewer; each
 * facet carries its own normal and baked shade, like the drum kit.
 */

export const MARBLE = 0xf1ece0;
export const VERDE = 0x3f6b55;
export const ROSA = 0xd9a5a0;
export const DOME_TILE = 0xc0602f;

const SIDES = 8;
/** Corner angle k (a face looks straight at the viewer). */
const corner = (k: number) => Math.PI / 8 + (k * Math.PI) / 4;
const mid = (i: number) => (i * Math.PI) / 4 + Math.PI / 4;
const towards = (phi: number) => Math.cos(phi) + Math.sin(phi);
const wallLight = (phi: number) => baked(0.86 + 0.14 * (Math.sin(phi) - Math.cos(phi)));

/** Facet indices facing the viewer, back to front. */
function visible(limit = -0.25): number[] {
  return [...Array(SIDES).keys()].filter((i) => towards(mid(i)) > limit).sort((a, b) => towards(mid(a)) - towards(mid(b)));
}

function at(p: IsoPainter, uc: number, vc: number, r: number, a: number, z: number): Pt {
  return p.p(uc + r * Math.cos(a), vc + r * Math.sin(a), z);
}

/** Marble incrustation on a face (face-local): white ground, green frames and pink panels in two registers. */
export function marbleFace(ctx: Ctx, w: number, h: number, light: number, bay = 22): void {
  ctx.fillStyle = css(shade(MARBLE, light));
  ctx.fillRect(0, -h, w, h);
  const regs = Math.max(1, Math.round(h / 34));
  const rh = h / regs;
  for (let r = 0; r < regs; r++) {
    ctx.fillStyle = css(shade(VERDE, light));
    ctx.fillRect(0, -(r + 1) * rh, w, 2);
    const n = Math.max(1, Math.round(w / bay));
    for (let i = 0; i < n; i++) {
      const x = (i * w) / n;
      ctx.fillStyle = css(shade(VERDE, light));
      ctx.fillRect(x, -(r + 1) * rh + 2, 1.6, rh - 2);
      ctx.fillStyle = css(shade(ROSA, light));
      ctx.fillRect(x + w / n / 2 - 3, -(r + 0.5) * rh - 5, 6, 10);
      ctx.strokeStyle = css(shade(VERDE, light));
      ctx.lineWidth = 1;
      ctx.strokeRect(x + w / n / 2 - 4.5, -(r + 0.5) * rh - 6.5, 9, 13);
    }
  }
}

/** Octagonal marble prism (drum, lantern, tribune) from z0 to z1, with an oculus on each facet when `oculi`. */
export function octaPrism(p: IsoPainter, uc: number, vc: number, r: number, z0: number, z1: number, oculi: boolean, color = MARBLE): void {
  const ctx = p.ctx;
  for (const i of visible()) {
    const a0 = corner(i);
    const a1 = corner(i + 1);
    const pts: Pt[] = [at(p, uc, vc, r, a0, z0), at(p, uc, vc, r, a1, z0), at(p, uc, vc, r, a1, z1), at(p, uc, vc, r, a0, z1)];
    const l = wallLight(mid(i));
    p.fillPoly(pts, css(shade(color, l)));
    p.normals.fill(pts, normalize(tileToView(Math.cos(mid(i)), Math.sin(mid(i)), 0)));
    // Green corner pilasters and a green course at top and foot.
    ctx.strokeStyle = css(shade(VERDE, l));
    ctx.lineWidth = 2.2;
    for (const a of [a0, a1]) {
      const [x0, y0] = at(p, uc, vc, r, a, z0);
      const [, y1] = at(p, uc, vc, r, a, z1);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0, y1);
      ctx.stroke();
    }
    ctx.lineWidth = 1.6;
    for (const z of [z0 + 2, z1 - 2]) {
      const a = at(p, uc, vc, r, a0, z);
      const b = at(p, uc, vc, r, a1, z);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    if (oculi && towards(mid(i)) > 0.2) {
      const [cx, cy] = at(p, uc, vc, r, mid(i), (z0 + z1) / 2);
      const k = Math.max(0.35, towards(mid(i)) / Math.SQRT2);
      ctx.fillStyle = css(shade(VERDE, l));
      ctx.beginPath();
      ctx.ellipse(cx, cy, 6.5 * k, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = css(shade(0x2b2420, l));
      ctx.beginPath();
      ctx.ellipse(cx, cy, 4.5 * k, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    p.strokePoly(pts, css(shade(color, 0.5), 0.4), 0.8);
  }
  for (let k = 0; k < SIDES; k++) p.addVolumePoint(uc + r * Math.cos(corner(k)), vc + r * Math.sin(corner(k)), z1);
}

/** Dome profile: (height share, radius share) from the springing to the lantern's eye — a pointed fifth. */
const PROFILE: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [0.2, 0.98], [0.38, 0.92], [0.54, 0.83], [0.68, 0.71], [0.8, 0.57], [0.9, 0.41], [0.97, 0.26], [1, 0.17],
];

/**
 * Octagonal ribbed dome on (uc, vc) from z (radius r tiles at the
 * springing, `h` px high): terracotta webs between eight white marble
 * ribs; `rings` limits it to the lowest bands (a dome still rising).
 * Returns the eye's height.
 */
export function octaDome(p: IsoPainter, uc: number, vc: number, r: number, z: number, h: number, rings = PROFILE.length - 1): number {
  const ctx = p.ctx;
  const n = Math.min(rings, PROFILE.length - 1);
  for (const i of visible(-0.6)) {
    const a0 = corner(i);
    const a1 = corner(i + 1);
    const phi = mid(i);
    for (let j = 0; j < n; j++) {
      const [z0s, r0s] = PROFILE[j]!;
      const [z1s, r1s] = PROFILE[j + 1]!;
      const za = z + z0s * h;
      const zb = z + z1s * h;
      const pts: Pt[] = [at(p, uc, vc, r * r0s, a0, za), at(p, uc, vc, r * r0s, a1, za), at(p, uc, vc, r * r1s, a1, zb), at(p, uc, vc, r * r1s, a0, zb)];
      const run = (r0s - r1s) * r * HW * Math.SQRT2;
      const rise = (zb - za) / SCREEN_PER_WORLD_HEIGHT;
      const up = run / Math.max(1e-6, run + rise);
      const l = baked(0.82 + 0.16 * (Math.sin(phi) - Math.cos(phi)) * (1 - up * 0.5) + up * 0.18);
      p.fillPoly(pts, css(shade(DOME_TILE, l)));
      p.normals.fill(pts, slopeNormal(Math.cos(phi), Math.sin(phi), Math.max(run, 0.01), Math.max(rise, 0.01)));
      // Tile courses.
      ctx.strokeStyle = css(shade(DOME_TILE, l * 0.78), 0.55);
      ctx.lineWidth = 0.7;
      for (const t of [0.33, 0.66]) {
        const zt = za + (zb - za) * t;
        const rt = r * (r0s + (r1s - r0s) * t);
        const a = at(p, uc, vc, rt, a0, zt);
        const b = at(p, uc, vc, rt, a1, zt);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
    }
  }
  // White ribs along the corners that show, and the ring at the springing.
  ctx.strokeStyle = css(MARBLE);
  ctx.lineCap = 'round';
  for (let k = 0; k < SIDES; k++) {
    const a = corner(k);
    if (towards(a) < -0.5) continue;
    ctx.lineWidth = towards(a) > 0.6 ? 3.4 : 2.6;
    ctx.beginPath();
    for (let j = 0; j <= n; j++) {
      const [zs, rs] = PROFILE[j]!;
      const [x, y] = at(p, uc, vc, r * rs, a, z + zs * h);
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let k = 0; k <= 4; k++) {
    const [x, y] = at(p, uc, vc, r, corner(k + 6), z);
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  const top = z + PROFILE[n]![0] * h;
  for (let k = 0; k < SIDES; k++) p.addVolumePoint(uc + r * PROFILE[n]![1] * Math.cos(corner(k)), vc + r * PROFILE[n]![1] * Math.sin(corner(k)), top);
  return top;
}

/** Marble lantern on the dome's eye: an octagonal shrine, a fluted cone and the gilt ball and cross. Returns the top. */
export function domeLantern(p: IsoPainter, uc: number, vc: number, z: number, r: number): number {
  octaPrism(p, uc, vc, r, z, z + 22, false);
  const [x, y] = p.p(uc, vc, z + 11);
  p.ctx.fillStyle = 'rgba(40,32,26,.85)';
  for (const dx of [-0.45, 0.15]) p.ctx.fillRect(x + dx * r * HW * 2.2, y - 8, 3, 14);
  const cone: Array<readonly [number, number]> = [[0, r * 1.15], [3, r * 1.15], [4, r * 0.9], [14, r * 0.45], [24, r * 0.1]];
  octaCone(p, uc, vc, z + 22, cone);
  finial(p, uc, vc, z + 46, 14, false);
  return z + 60;
}

/** Simple turned marble cone (lathe) for the lantern. */
function octaCone(p: IsoPainter, uc: number, vc: number, z: number, profile: ReadonlyArray<readonly [number, number]>): void {
  for (const i of visible(-0.4)) {
    const a0 = corner(i);
    const a1 = corner(i + 1);
    const l = wallLight(mid(i)) * 1.05;
    for (let j = 0; j + 1 < profile.length; j++) {
      const [za, ra] = profile[j]!;
      const [zb, rb] = profile[j + 1]!;
      const pts: Pt[] = [at(p, uc, vc, ra, a0, z + za), at(p, uc, vc, ra, a1, z + za), at(p, uc, vc, rb, a1, z + zb), at(p, uc, vc, rb, a0, z + zb)];
      p.fillPoly(pts, css(shade(MARBLE, l)));
      p.normals.fill(pts, normalize(tileToView(Math.cos(mid(i)), Math.sin(mid(i)), 0.6)));
    }
  }
  p.addVolumePoint(uc, vc, z + (profile[profile.length - 1]?.[0] ?? 0));
}
