import { ellipse } from '../../canvas';
import { HW, type IsoPainter } from '../../isoPainter';
import { baked } from '../../lighting/normalLayer';
import { normalize, tileToView, type Vec3 } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import type { ArchStyle } from '../style';

type Pt = readonly [number, number];

/*
 * Round buildings (Romano-British / Celtic): a faceted drum wall and a
 * faceted cone roof. Each facet carries its own normal (horizontal for
 * the drum, sloped for the cone) and a baked shade from the upper-left
 * sun, so the round forms light like the box-and-slope buildings.
 */

const FACETS = 20;

/** Outward direction of facet i (mid angle) in tile axes. */
function facetAngle(i: number, n: number): number {
  return ((i + 0.5) / n) * Math.PI * 2;
}

/** Baked wall shade for an outward direction: +v faces lit (1.0), +u faces in shade (0.72). */
function wallLight(phi: number): number {
  return baked(0.86 + 0.14 * (Math.sin(phi) - Math.cos(phi)));
}

/** Baked roof shade (as IsoPainter's slopes: +v 1.05, +u 0.75). */
function roofLight(phi: number): number {
  return baked(0.9 + 0.15 * (Math.sin(phi) - Math.cos(phi)));
}

/** How much a direction faces the viewer (> 0 = towards the camera). */
function towards(phi: number): number {
  return Math.cos(phi) + Math.sin(phi);
}

function rim(p: IsoPainter, uc: number, vc: number, r: number, a: number, z: number): Pt {
  return p.p(uc + r * Math.cos(a), vc + r * Math.sin(a), z);
}

/** Facet indices sorted back → front (painter's order). */
function backToFront(n: number): number[] {
  return [...Array(n).keys()].sort((a, b) => towards(facetAngle(a, n)) - towards(facetAngle(b, n)));
}

export type DrumDetail = 'daub' | 'wattle' | 'stone';

/** Faceted round wall (drum) of radius r tiles centred on (uc, vc), from z0 to z1. Only the visible half is painted. */
export function drumWall(p: IsoPainter, uc: number, vc: number, r: number, z0: number, z1: number, color: number, detail: DrumDetail = 'daub'): void {
  const ctx = p.ctx;
  for (const i of backToFront(FACETS)) {
    const phi = facetAngle(i, FACETS);
    if (towards(phi) < -0.2) continue;
    const a0 = (i / FACETS) * Math.PI * 2;
    const a1 = ((i + 1) / FACETS) * Math.PI * 2;
    const pts = [rim(p, uc, vc, r, a0, z0), rim(p, uc, vc, r, a1, z0), rim(p, uc, vc, r, a1, z1), rim(p, uc, vc, r, a0, z1)];
    const l = wallLight(phi);
    const ys = pts.map((q) => q[1]);
    const g = ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
    g.addColorStop(0, css(shade(color, l * 1.05)));
    g.addColorStop(0.8, css(shade(color, l * 0.95)));
    g.addColorStop(1, css(shade(color, l * baked(0.72))));
    p.fillPoly(pts, g);
    p.strokePoly(pts, css(shade(color, l)), 0.6);
    p.normals.fill(pts, normalize(tileToView(Math.cos(phi), Math.sin(phi), 0)));
  }
  drumTexture(p, uc, vc, r, z0, z1, color, detail);
  // Crisp silhouette: the lower rim.
  ctx.strokeStyle = css(shade(color, 0.4), 0.6);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let k = 0; k <= 24; k++) {
    const a = -Math.PI / 4 + (k / 24) * Math.PI;
    const [x, y] = rim(p, uc, vc, r, a, z0);
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  for (let k = 0; k < 8; k++) p.addVolumePoint(uc + r * Math.cos((k / 8) * Math.PI * 2), vc + r * Math.sin((k / 8) * Math.PI * 2), z1);
}

/** Surface texture of the visible half of a drum. */
function drumTexture(p: IsoPainter, uc: number, vc: number, r: number, z0: number, z1: number, color: number, detail: DrumDetail): void {
  const ctx = p.ctx;
  const h = z1 - z0;
  const area = r * h;
  if (detail === 'stone') {
    for (let k = 0; k < area * 7; k++) {
      const a = -Math.PI / 4 + 0.08 + p.random() * (Math.PI - 0.16);
      const z = z0 + 2 + p.random() * (h - 4);
      const [x, y] = rim(p, uc, vc, r, a, z);
      const face = towards(a) / Math.SQRT2;
      ellipse(ctx, x, y, (3 + p.random() * 3) * (0.35 + face * 0.65), 2 + p.random() * 1.4);
      ctx.fillStyle = css(shade(color, wallLight(a) * (0.78 + p.random() * 0.4)));
      ctx.fill();
    }
    return;
  }
  // Wattle: woven rods as courses round the drum; daub: lime-wash blotches and a damp base.
  if (detail === 'wattle') {
    for (let z = z0 + 3; z < z1 - 1; z += 3.2) {
      ctx.strokeStyle = css(shade(color, 0.62), 0.55);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let k = 0; k <= 18; k++) {
        const a = -Math.PI / 4 + (k / 18) * Math.PI;
        const [x, y] = rim(p, uc, vc, r, a, z + (k % 2 ? 0.8 : -0.8));
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    return;
  }
  for (let k = 0; k < area * 4; k++) {
    const a = -Math.PI / 4 + 0.1 + p.random() * (Math.PI - 0.2);
    const [x, y] = rim(p, uc, vc, r, a, z0 + p.random() * h);
    ellipse(ctx, x, y, 2 + p.random() * 4, 1.5 + p.random() * 2.5);
    ctx.fillStyle = css(shade(color, wallLight(a) * (0.88 + p.random() * 0.22)), 0.5);
    ctx.fill();
  }
  ctx.save();
  ctx.beginPath();
  for (let k = 0; k <= 24; k++) {
    const a = -Math.PI / 4 + (k / 24) * Math.PI;
    const [x, y] = rim(p, uc, vc, r, a, z0);
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let k = 24; k >= 0; k--) {
    const a = -Math.PI / 4 + (k / 24) * Math.PI;
    const [x, y] = rim(p, uc, vc, r, a, z0 + 6);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(70,60,45,.28)';
  ctx.fill();
  ctx.restore();
}

/**
 * Faceted cone roof: base radius r tiles at height `eave`, apex `rise`
 * above, painted back → front with per-facet slope normals, then a
 * thatch (radial straw, binding rings, heavy eave) or slate (courses)
 * cover. Returns the apex's canvas point.
 */
export function coneRoof(p: IsoPainter, uc: number, vc: number, r: number, eave: number, rise: number, color: number, cover: 'thatch' | 'slate'): Pt {
  const ctx = p.ctx;
  const apex = p.p(uc, vc, eave + rise);
  const visible: number[] = [];
  for (const i of backToFront(FACETS)) {
    const phi = facetAngle(i, FACETS);
    const a0 = (i / FACETS) * Math.PI * 2;
    const a1 = ((i + 1) / FACETS) * Math.PI * 2;
    const pts = [rim(p, uc, vc, r, a0, eave), rim(p, uc, vc, r, a1, eave), apex];
    const n: Vec3 = p.slope(Math.cos(phi), Math.sin(phi), r, rise);
    if (n[2] > 0) visible.push(i);
    const fill = css(shade(color, roofLight(phi)));
    p.fillPoly(pts, fill);
    p.strokePoly(pts, fill, 0.7);
    p.normals.fill(pts, n);
  }
  ctx.save();
  ctx.beginPath();
  for (const i of visible) {
    const a0 = (i / FACETS) * Math.PI * 2;
    const a1 = ((i + 1) / FACETS) * Math.PI * 2;
    const [b, c] = [rim(p, uc, vc, r, a0, eave), rim(p, uc, vc, r, a1, eave)];
    ctx.moveTo(apex[0], apex[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(c[0], c[1]);
    ctx.closePath();
  }
  ctx.clip();
  const at = (a: number, t: number): Pt => {
    const [x, y] = rim(p, uc, vc, r, a, eave);
    return [apex[0] + (x - apex[0]) * t, apex[1] + (y - apex[1]) * t];
  };
  if (cover === 'thatch') {
    const strokes = Math.round(140 + r * 220);
    for (let k = 0; k < strokes; k++) {
      const a = p.random() * Math.PI * 2;
      const t0 = 0.05 + p.random() * 0.8;
      const q0 = at(a, t0);
      const q1 = at(a + (p.random() - 0.5) * 0.04, Math.min(1.02, t0 + 0.12 + p.random() * 0.3));
      ctx.strokeStyle = css(shade(color, roofLight(a) * (0.6 + p.random() * 0.62)), 0.55);
      ctx.lineWidth = 0.9 + p.random() * 0.8;
      ctx.beginPath();
      ctx.moveTo(q0[0], q0[1]);
      ctx.lineTo(q1[0], q1[1]);
      ctx.stroke();
    }
    ring(ctx, at, 0.4, css(shade(color, 0.5), 0.45), 2);
    ring(ctx, at, 0.72, css(shade(color, 0.5), 0.45), 2);
    ring(ctx, at, 0.95, css(shade(color, 0.5), 0.8), 5);
    // Ridge cap of bound straw at the apex.
    ctx.fillStyle = css(shade(color, 0.7));
    ellipse(ctx, apex[0], apex[1] + 3, 5, 3.5);
    ctx.fill();
  } else {
    for (let t = 0.16; t < 1; t += 0.085) ring(ctx, at, t, css(shade(color, 0.5), 0.7), 1.1);
    for (let k = 0; k < 60; k++) {
      const a = p.random() * Math.PI * 2;
      const t = 0.1 + p.random() * 0.88;
      const q0 = at(a, t);
      const q1 = at(a, t + 0.06);
      ctx.strokeStyle = css(shade(color, 0.6), 0.5);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(q0[0], q0[1]);
      ctx.lineTo(q1[0], q1[1]);
      ctx.stroke();
    }
  }
  ctx.restore();
  for (let k = 0; k < 8; k++) p.addVolumePoint(uc + r * Math.cos((k / 8) * Math.PI * 2), vc + r * Math.sin((k / 8) * Math.PI * 2), eave);
  p.addVolumePoint(uc, vc, eave + rise);
  return apex;
}

function ring(ctx: CanvasRenderingContext2D, at: (a: number, t: number) => Pt, t: number, color: string, width: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (let k = 0; k <= 32; k++) {
    const [x, y] = at(-Math.PI / 4 + (k / 32) * Math.PI, t);
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

/**
 * Opening in a drum wall facing direction `phi`: a timber-framed
 * doorway (`fire` = firelit interior that glows at dusk) or a small
 * shuttered window hole. `halfW` is in art px along the wall.
 */
export function drumOpening(p: IsoPainter, uc: number, vc: number, r: number, phi: number, halfW: number, z0: number, h: number, frame: number, kind: 'fire' | 'dark' = 'fire'): void {
  const ctx = p.ctx;
  const t = halfW / (HW * Math.SQRT2);
  const at = (s: number, z: number): Pt => {
    const ru = r + 0.01;
    return p.p(uc + ru * Math.cos(phi) - Math.sin(phi) * s * t, vc + ru * Math.sin(phi) + Math.cos(phi) * s * t, z);
  };
  const outline = (grow: number): Pt[] => {
    const pts: Pt[] = [at(-1 - grow, z0), at(1 + grow, z0)];
    for (let k = 0; k <= 8; k++) {
      const a = (k / 8) * Math.PI;
      pts.push(at(Math.cos(a) * (1 + grow), z0 + h - halfW + Math.sin(a) * halfW * (1 + grow)));
    }
    return pts;
  };
  p.fillPoly(outline(0.35), css(shade(frame, wallLight(phi))));
  const inner = outline(0);
  const [bx, by] = at(0, z0);
  const g = ctx.createRadialGradient(bx, by - h * 0.25, 1, bx, by - h * 0.25, h);
  if (kind === 'fire') {
    g.addColorStop(0, '#ffd27a');
    g.addColorStop(0.35, '#d0702c');
    g.addColorStop(1, '#2a160a');
  } else {
    g.addColorStop(0, '#2c2016');
    g.addColorStop(1, '#120c08');
  }
  p.fillPoly(inner, g);
  if (kind === 'fire') p.addGlow(bx, by - h * 0.4, Math.max(halfW * 1.4, h * 0.6));
}

/** Smoke curling out of a thatched apex (roundhouses have no chimney): records the smoke anchor. */
export function apexSmoke(p: IsoPainter, uc: number, vc: number, top: number): void {
  p.addSmoke(uc, vc, top - 4);
}

/** Dark band under an eave, baked round the visible half of a drum (z0 → z1 darkening upward). */
export function drumEaveShade(p: IsoPainter, uc: number, vc: number, r: number, z0: number, z1: number): void {
  for (const i of backToFront(FACETS)) {
    const phi = facetAngle(i, FACETS);
    if (towards(phi) < -0.2) continue;
    const a0 = (i / FACETS) * Math.PI * 2;
    const a1 = ((i + 1) / FACETS) * Math.PI * 2;
    const pts = [rim(p, uc, vc, r + 0.004, a0, z0), rim(p, uc, vc, r + 0.004, a1, z0), rim(p, uc, vc, r + 0.004, a1, z1), rim(p, uc, vc, r + 0.004, a0, z1)];
    const ys = pts.map((q) => q[1]);
    const g = p.ctx.createLinearGradient(0, Math.max(...ys), 0, Math.min(...ys));
    g.addColorStop(0, 'rgba(25,18,12,0)');
    g.addColorStop(1, 'rgba(25,18,12,.55)');
    p.fillPoly(pts, g);
  }
}

export interface RoundhouseSpec {
  /** Drum radius (tiles). */
  readonly r: number;
  /** Wall height (art px). */
  readonly wall: number;
  /** Cone rise at pitch 1 (scaled by the style's pitch). */
  readonly rise: number;
  /** Doorway facing direction (radians in tile axes, π/2 = +v); none when undefined. */
  readonly door?: number;
  /** Doorway interior: firelit (glows at dusk) or dark. */
  readonly fire?: boolean;
  readonly color?: number;
  readonly detail?: DrumDetail;
  readonly cover?: 'thatch' | 'slate';
  readonly roofColor?: number;
  /** Hearth smoke seeping from the apex (domestic: follows the chimneys ornament). */
  readonly smoke?: boolean;
}

/**
 * Celtic roundhouse: stone footing, daub / wattle / stone drum, a
 * timber doorway, and a tall cone roof overhanging the wall. Returns
 * the apex height (art px).
 */
export function roundhouse(p: IsoPainter, s: ArchStyle, uc: number, vc: number, spec: RoundhouseSpec): number {
  const c = s.palette;
  const { r, wall } = spec;
  drumWall(p, uc, vc, r + 0.02, 0, 6, c.stone, 'stone');
  drumWall(p, uc, vc, r, 6, wall, spec.color ?? c.plaster, spec.detail ?? 'daub');
  if (spec.door !== undefined) drumOpening(p, uc, vc, r, spec.door, 8, 2, Math.min(24, wall - 10), c.timber, spec.fire === false ? 'dark' : 'fire');
  drumEaveShade(p, uc, vc, r, wall - 12, wall);
  const rise = spec.rise * s.roof.pitch;
  const eave = wall - 3;
  coneRoof(p, uc, vc, r + 0.17, eave, rise, spec.roofColor ?? c.thatch, spec.cover ?? 'thatch');
  if (spec.smoke && s.ornaments.chimneys) apexSmoke(p, uc, vc, eave + rise);
  return eave + rise;
}
