import { HW, type IsoPainter } from '../../isoPainter';
import { baked } from '../../lighting/normalLayer';
import { N_LEFT, N_RIGHT } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';

type Pt = readonly [number, number];

/*
 * Turf roof kit (northern sod roof): a low gable laid with birch bark
 * and heavy sods, so it reads as a rounded green mass rather than a
 * plank gable — the slopes bulge (flat at the ridge, steep at the
 * eave), a thick sod edge with a pale bark lip hangs over the eaves and
 * the gable verge, and grass tufts break the outline. The gable end is
 * log courses in the wall's colour.
 */

/** Strips each slope is painted in (the bulge is a polyline of this many segments). */
const STRIPS = 5;
/** Thickness of the sod edge over the eaves (art px). */
const SOD = 5;
const SOIL = 0x4a3a27;

export interface TurfRoofOpts {
  /** Sod colour (summer grass). */
  readonly turf: number;
  /** Log colour of the gable end. */
  readonly gable: number;
  /** Birch-bark lip under the sod. */
  readonly bark: number;
  /** Overhang past the walls (tiles). */
  readonly overhang?: number;
}

/** Height fraction of the roof at t across the slope (0 ridge … 1 eave): a rounded loaf. */
const bulge = (t: number): number => 1 - t * t;

/**
 * Turf roof over u0..u1 × v0..v1 from `eave`, `rise` art px high at the
 * ridge, ridge along `axis`; the gable end facing the viewer is at u1
 * (axis 'u') or v1 (axis 'v'). Returns the ridge height.
 */
export function turfRoof(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, eave: number, rise: number, axis: 'u' | 'v', o: TurfRoofOpts): number {
  const ov = o.overhang ?? 0.1;
  const along = axis === 'u';
  // a runs along the ridge, b across it; pt maps (a, b, z) to the canvas.
  const [a0, a1] = along ? [u0 - ov, u1 + ov] : [v0 - ov, v1 + ov];
  const [b0, b1] = along ? [v0 - ov, v1 + ov] : [u0 - ov, u1 + ov];
  const bm = (b0 + b1) / 2;
  const half = bm - b0;
  const top = eave + rise;
  const pt = (a: number, b: number, z: number): Pt => (along ? p.p(a, b, z) : p.p(b, a, z));
  const zAt = (t: number) => eave + rise * bulge(t);
  // Profile from the ridge out to one eave (side -1 = back, +1 = front).
  const profile = (side: number) => Array.from({ length: STRIPS + 1 }, (_, k) => [bm + side * half * (k / STRIPS), zAt(k / STRIPS)] as const);
  const slopeNormal = (side: number, k: number) => {
    const dz = (zAt(k / STRIPS) - zAt((k + 1) / STRIPS));
    const run = half / STRIPS;
    return along ? p.slope(0, side, run, dz) : p.slope(side, 0, run, dz);
  };
  const strip = (side: number, k: number, light: number) => {
    const pr = profile(side);
    const [ba, za] = pr[k]!;
    const [bb, zb] = pr[k + 1]!;
    const pts: Pt[] = [pt(a0, ba, za), pt(a1, ba, za), pt(a1, bb, zb), pt(a0, bb, zb)];
    p.fillPoly(pts, css(shade(o.turf, light * (0.96 + 0.08 * (1 - k / STRIPS)))));
    p.normals.fill(pts, slopeNormal(side, k));
    return pts;
  };
  const back = along ? baked(0.82) : baked(0.88);
  const front = along ? baked(1.04) : baked(0.8);
  for (let k = 0; k < STRIPS; k++) strip(-1, k, back);
  // Gable end: log courses under the rounded verge.
  const verge = [...profile(-1).reverse(), ...profile(1).slice(1)].map(([b, z]) => pt(a1 - ov, b, z));
  const inner: Pt[] = [pt(a1 - ov, along ? v0 : u0, eave), ...verge.slice(1, -1), pt(a1 - ov, along ? v1 : u1, eave)];
  const wallLight = along ? baked(0.72) : 1;
  p.fillPoly(inner, css(shade(o.gable, wallLight)));
  p.normals.fill(inner, along ? N_RIGHT : N_LEFT);
  const ctx = p.ctx;
  ctx.save();
  p.fillPoly(inner, 'rgba(0,0,0,0)');
  ctx.clip();
  for (let z = eave; z < top; z += 8) {
    const l = pt(a1 - ov, b0, z);
    const r = pt(a1 - ov, b1, z);
    ctx.fillStyle = css(shade(o.gable, wallLight * 0.62), 0.6);
    ctx.beginPath();
    ctx.moveTo(l[0], l[1] - 1.2);
    ctx.lineTo(r[0], r[1] - 1.2);
    ctx.lineTo(r[0], r[1]);
    ctx.lineTo(l[0], l[1]);
    ctx.fill();
  }
  ctx.restore();
  for (let k = 0; k < STRIPS; k++) strip(1, k, front);
  // Sod edge along the gable verge: a thick dark band with a bark lip.
  sodLine(p, verge, o, wallLight);
  grass(p, pt(a0, bm, top), pt(a1, bm, top), o.turf, front);
  // Sod edge hanging over the front eave.
  const e0 = pt(a0, b1, eave);
  const e1 = pt(a1, b1, eave);
  const edge: Pt[] = [e0, e1, [e1[0], e1[1] + SOD], [e0[0], e0[1] + SOD]];
  p.fillPoly(edge, css(shade(SOIL, front * 0.9)));
  p.normals.fill(edge, along ? N_LEFT : N_RIGHT);
  ctx.strokeStyle = css(shade(o.bark, front));
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(e0[0], e0[1] + SOD);
  ctx.lineTo(e1[0], e1[1] + SOD);
  ctx.stroke();
  tufts(p, e0, e1, o.turf, front, 2.5);
  // Speckled grass over the front slopes.
  const n = Math.round(Math.hypot(e1[0] - e0[0], e1[1] - e0[1]) * 0.9);
  for (let i = 0; i < n; i++) {
    const t = p.random();
    const k = p.random();
    const [b, z] = [bm + half * k, zAt(k)];
    const [x, y] = pt(a0 + (a1 - a0) * t, b, z);
    ctx.fillStyle = css(shade(o.turf, front * (0.7 + p.random() * 0.6)), 0.75);
    ctx.fillRect(x, y, 2, 1.3);
  }
  p.recordRoof(u0 - ov, v0 - ov, u1 + ov, v1 + ov, eave, [pt(a0, bm, 0), pt(a1, bm, 0)], top);
  return top;
}

/** Thick sod edge along a canvas polyline, bark lip beneath, tufts on top. */
function sodLine(p: IsoPainter, pts: readonly Pt[], o: TurfRoofOpts, light: number): void {
  const ctx = p.ctx;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const path = (dy: number) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y + dy) : ctx.lineTo(x, y + dy)));
  };
  path(2.6);
  ctx.strokeStyle = css(shade(o.bark, light));
  ctx.lineWidth = 1.6;
  ctx.stroke();
  path(0);
  ctx.strokeStyle = css(shade(SOIL, light));
  ctx.lineWidth = 4.2;
  ctx.stroke();
  path(-1.5);
  ctx.strokeStyle = css(shade(o.turf, light * 1.05));
  ctx.lineWidth = 2.4;
  ctx.stroke();
  for (let i = 0; i + 1 < pts.length; i++) tufts(p, pts[i]!, pts[i + 1]!, o.turf, light, 1.5);
}

/** Grass blades standing along a canvas segment (the fuzzy turf outline). */
export function tufts(p: IsoPainter, a: Pt, b: Pt, turf: number, light: number, every: number): void {
  const ctx = p.ctx;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(2, Math.round(len / (every * 2.2)));
  ctx.lineWidth = 1;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    const h = 2.5 + p.random() * 3.5;
    ctx.strokeStyle = css(shade(turf, light * (0.85 + p.random() * 0.45)));
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (p.random() - 0.5) * 3, y - h);
    ctx.stroke();
  }
}

/** The rounded ridge: a soft highlight with tufts. */
function grass(p: IsoPainter, a: Pt, b: Pt, turf: number, light: number): void {
  const ctx = p.ctx;
  ctx.strokeStyle = css(shade(turf, light * 1.18), 0.85);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  tufts(p, a, b, turf, light * 1.1, 2);
}

/**
 * Turf mound (a sod-covered earth heap: a tar pit's charge, a root
 * cellar) as a low dome of radius r tiles at (u, v), h art px high.
 */
export function turfMound(p: IsoPainter, u: number, v: number, r: number, h: number, turf: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  const rx = r * HW * Math.SQRT2;
  const ry = rx / 2;
  const pts: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI + (i / 16) * Math.PI;
    pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * h]);
  }
  for (let i = 1; i < 8; i++) {
    const a = (i / 8) * Math.PI;
    pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]);
  }
  const g = ctx.createLinearGradient(x - rx, 0, x + rx, 0);
  g.addColorStop(0, css(shade(turf, 1.12)));
  g.addColorStop(0.55, css(shade(turf, 0.9)));
  g.addColorStop(1, css(shade(turf, 0.62)));
  p.fillPoly(pts, g);
  p.normals.cylinderPoly(pts, x - rx, rx * 2);
  for (let i = 0; i < 16; i += 2) tufts(p, pts[i]!, pts[i + 1]!, turf, 1, 1.5);
  p.addVolumePoint(u, v, h);
  for (const [du, dv] of [[-r, 0], [0, -r], [r, 0], [0, r]] as const) p.addVolumePoint(u + du, v + dv, 0);
}
