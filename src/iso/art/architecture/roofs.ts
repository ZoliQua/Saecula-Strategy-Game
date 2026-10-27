import { lerp } from '../isoProps';
import { HW, type IsoPainter } from '../isoPainter';
import { baked } from '../lighting/normalLayer';
import { css, shade } from '../palette';
import type { RoofMaterial } from '../roofCover';

type Pt = readonly [number, number];

/*
 * Roof shapes beyond IsoPainter's gable / hip: mansard, porch lean-to,
 * dormers and turned (lathe) helms for towers. All paint normals and
 * shadow volume through the painter.
 */

/**
 * Mansard: a steep lower frustum (eave → eave+lowerRise, inset by
 * `inset` tiles) under a shallow hip, `trim` on the curb. Returns the upper hip's apex.
 */
export function mansardRoof(
  p: IsoPainter,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  eave: number,
  lowerRise: number,
  inset: number,
  upperRise: number,
  color: number,
  upperColor: number,
  overhang: number,
  trim: number,
): Pt {
  const o = overhang;
  const zt = eave + lowerRise;
  const A = p.p(u0 - o, v0 - o, eave);
  const B = p.p(u1 + o, v0 - o, eave);
  const C = p.p(u1 + o, v1 + o, eave);
  const D = p.p(u0 - o, v1 + o, eave);
  const a = p.p(u0 + inset, v0 + inset, zt);
  const b = p.p(u1 - inset, v0 + inset, zt);
  const c = p.p(u1 - inset, v1 - inset, zt);
  const d = p.p(u0 + inset, v1 - inset, zt);
  const run = inset + o;
  p.fillPoly([A, B, b, a], css(shade(color, baked(0.8))));
  p.normals.fill([A, B, b, a], p.slope(0, -1, run, lowerRise));
  p.fillPoly([D, A, a, d], css(shade(color, baked(0.92))));
  p.normals.fill([D, A, a, d], p.slope(-1, 0, run, lowerRise));
  p.roofSlope([D, C, c, d], color, baked(1.05), p.slope(0, 1, run, lowerRise), (t) => [lerp(d, D, t), lerp(c, C, t)]);
  p.roofSlope([C, B, b, c], color, baked(0.76), p.slope(1, 0, run, lowerRise), (t) => [lerp(c, C, t), lerp(b, B, t)]);
  // Curb moulding where the slopes break.
  p.strokePoly([d, c, b], css(shade(trim, 0.95)), 2.2);
  p.recordRoof(u0 - o, v0 - o, u1 + o, v1 + o, eave, [], zt);
  return p.hipRoof(u0 + inset, v0 + inset, u1 - inset, v1 - inset, zt, upperRise, upperColor, 0.02);
}

/** Lean-to porch roof along the +v face (v = vWall) out to vWall + depth. */
export function porchRoofLeft(p: IsoPainter, u0: number, u1: number, vWall: number, depth: number, zTop: number, zLow: number, color: number): void {
  const pts = [p.p(u0, vWall, zTop), p.p(u1, vWall, zTop), p.p(u1, vWall + depth, zLow), p.p(u0, vWall + depth, zLow)];
  const a = pts[0]!;
  const b = pts[1]!;
  const c = pts[2]!;
  const d = pts[3]!;
  p.roofSlope(pts, color, baked(1.05), p.slope(0, 1, depth, zTop - zLow), (t) => [lerp(a, d, t), lerp(b, c, t)]);
  fascia(p, d, c, color);
  for (const [u, v] of [[u0, vWall + depth], [u1, vWall + depth]] as const) p.addVolumePoint(u, v, zLow);
}

/** Lean-to porch roof along the +u face (u = uWall) out to uWall + depth. */
export function porchRoofRight(p: IsoPainter, v0: number, v1: number, uWall: number, depth: number, zTop: number, zLow: number, color: number): void {
  const pts = [p.p(uWall, v1, zTop), p.p(uWall, v0, zTop), p.p(uWall + depth, v0, zLow), p.p(uWall + depth, v1, zLow)];
  const a = pts[0]!;
  const b = pts[1]!;
  const c = pts[2]!;
  const d = pts[3]!;
  p.roofSlope(pts, color, baked(0.78), p.slope(1, 0, depth, zTop - zLow), (t) => [lerp(a, d, t), lerp(b, c, t)]);
  fascia(p, c, d, color);
  for (const [u, v] of [[uWall + depth, v0], [uWall + depth, v1]] as const) p.addVolumePoint(u, v, zLow);
}

function fascia(p: IsoPainter, a: Pt, b: Pt, color: number): void {
  const ctx = p.ctx;
  ctx.strokeStyle = css(shade(color, 0.5));
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
}

/** Dormer on a +v roof slope: small wall with a window under its own little gable. */
export function dormerLeft(p: IsoPainter, uc: number, v: number, z: number, w: number, h: number, wall: number, roof: number, material: RoofMaterial): void {
  const prev = p.material;
  p.box(uc - w / 2, v - 0.22, uc + w / 2, v, z, z + h, { color: wall });
  p.leftFace(uc - w / 2, uc + w / 2, v, z, (fw, fh) => p.window(fw * 0.22, -fh + 3, fw * 0.56, fh - 5, true), h);
  p.material = material;
  p.gableRoof(uc - w / 2, v - 0.22, uc + w / 2, v, z + h, h * 0.7, roof, wall, 'v', 0.04);
  p.material = prev;
}

/** Dormer on a +u roof slope. */
export function dormerRight(p: IsoPainter, u: number, vc: number, z: number, w: number, h: number, wall: number, roof: number, material: RoofMaterial): void {
  const prev = p.material;
  p.box(u - 0.22, vc - w / 2, u, vc + w / 2, z, z + h, { color: wall });
  p.rightFace(vc - w / 2, vc + w / 2, u, z, (fw, fh) => p.window(fw * 0.22, -fh + 3, fw * 0.56, fh - 5, true), h);
  p.material = material;
  p.gableRoof(u - 0.22, vc - w / 2, u, vc + w / 2, z + h, h * 0.7, roof, wall, 'u', 0.04);
  p.material = prev;
}

/** One ring of a turned helm: radius in tiles at height z (art px above the base). */
export type HelmProfile = ReadonlyArray<readonly [z: number, r: number]>;

/**
 * Turned (lathe) helm — bell, onion, lantern — standing on (u, v, z0):
 * the silhouette is swept from `profile` (bottom → top) and shaded as
 * a cylinder; rib lines mark the profile's rings.
 */
export function helm(p: IsoPainter, u: number, v: number, z0: number, profile: HelmProfile, color: number, ribs = true): void {
  const ctx = p.ctx;
  const [x, y0] = p.p(u, v, z0);
  // A circle of radius r tiles projects to an ellipse r·√2·HW wide.
  const rx = (r: number) => r * Math.SQRT2 * HW;
  const left = profile.map(([z, r]) => [x - rx(r), y0 - z] as const);
  const right = [...profile].reverse().map(([z, r]) => [x + rx(r), y0 - z] as const);
  const base = profile[0];
  if (!base) return;
  const br = rx(base[1]);
  // Bottom ellipse arc closes the outline towards the viewer.
  const arc: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI;
    arc.push([x + Math.cos(a) * br, y0 - base[0] + Math.sin(a) * br * 0.5]);
  }
  const pts: Pt[] = [...left, ...right, ...arc];
  const maxR = Math.max(...profile.map(([, r]) => rx(r)));
  const g = ctx.createLinearGradient(x - maxR, 0, x + maxR, 0);
  g.addColorStop(0, css(shade(color, 1.18)));
  g.addColorStop(0.35, css(shade(color, 1.02)));
  g.addColorStop(0.8, css(shade(color, baked(0.62))));
  g.addColorStop(1, css(shade(color, baked(0.5))));
  p.fillPoly(pts, g);
  p.normals.cylinderPoly(pts, x - maxR, maxR * 2);
  ctx.save();
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
  ctx.closePath();
  ctx.clip();
  if (ribs) {
    for (const [z, r] of profile) {
      const er = rx(r);
      if (er < 2) continue;
      ctx.strokeStyle = css(shade(color, 0.55), 0.55);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y0 - z, er, er * 0.5, 0, 0, Math.PI);
      ctx.stroke();
    }
    // Vertical sheen.
    ctx.fillStyle = css(shade(color, 1.45), 0.35);
    ctx.fillRect(x - maxR * 0.55, y0 - (profile[profile.length - 1]?.[0] ?? 0), maxR * 0.14, 400);
  }
  ctx.restore();
  p.strokePoly(pts, css(shade(color, 0.4), 0.6), 1);
  const top = profile[profile.length - 1];
  p.addVolumePoint(u, v, z0 + (top?.[0] ?? 0));
}

/** Gilded orb and (double) cross finial on top of a helm or spire at canvas point. */
export function finial(p: IsoPainter, u: number, v: number, z: number, height = 18, double = true): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, z);
  ctx.fillStyle = '#e6c25a';
  ctx.beginPath();
  ctx.arc(x, y - 2.5, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c99b34';
  ctx.fillRect(x - 0.8, y - height, 1.6, height - 4);
  ctx.fillRect(x - 4, y - height + 5, 8, 1.6);
  if (double) ctx.fillRect(x - 2.8, y - height + 9, 5.6, 1.5);
}
