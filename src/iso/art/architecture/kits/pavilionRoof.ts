import type { IsoPainter } from '../../isoPainter';
import { lerp } from '../../isoProps';
import { baked } from '../../lighting/normalLayer';
import { N_LEFT, N_RIGHT, N_UP } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import type { ArchStyle } from '../style';
import { epi } from './pepperpot';

type Pt = readonly [number, number];

/*
 * Pavilion roof kit (toit en pavillon, comble à la française): a tall
 * truncated hip — four steep slate slopes up to a small leaded flat
 * with lead cresting and finials (épis) at its corners — and, with the
 * dormers ornament, oeil-de-boeuf dormers on the two visible slopes.
 * Reached through RoofProfile.form 'pavilion' (styledRoofs.ts), which
 * turns a style's hips, gables and mansards into pavilions of the same height,
 * so everything standing on the roof (cupolas, finials, stacks) keeps
 * its clearance.
 */

/** Share of the shorter span each slope climbs over (the rest is the flat): steep French slopes. */
const SLOPE_RUN = 0.36;

/** Whether the style turns its hips and mansards into pavilion roofs. */
export function hasPavilionRoofs(s: ArchStyle): boolean {
  return s.roof.form === 'pavilion';
}

/** Oeil-de-boeuf dormer standing on a slope: stone oval, lit glazing, curved lead hood (face-local, base at y = 0). */
function oculusDormer(p: IsoPainter, s: ArchStyle, w: number, h: number, light: number): void {
  const ctx = p.ctx;
  const c = s.palette;
  ctx.fillStyle = css(shade(c.trim, light));
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -h * 0.55);
  ctx.ellipse(w / 2, -h * 0.55, w / 2, h * 0.45, 0, Math.PI, 0);
  ctx.lineTo(w, 0);
  ctx.closePath();
  ctx.fill();
  // Lead hood over the oval.
  ctx.fillStyle = css(shade(c.roofAlt, light * 1.1));
  ctx.beginPath();
  ctx.ellipse(w / 2, -h * 0.58, w / 2 + 1.2, h * 0.47, 0, Math.PI, 0);
  ctx.ellipse(w / 2, -h * 0.58, w / 2 - 1.4, h * 0.38, 0, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();
  const ow = w * 0.5;
  const oh = h * 0.42;
  ctx.fillStyle = css(shade(c.trim, light * 0.7));
  ctx.beginPath();
  ctx.ellipse(w / 2, -h * 0.5, ow / 2 + 1.2, oh / 2 + 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  p.window(w / 2 - ow / 2, -h * 0.5 - oh / 2, ow, oh, true);
}

/** Which visible slopes carry dormers (a slope hidden behind a later block gets none, so no glow). */
export interface DormerSides {
  readonly v: boolean;
  readonly u: boolean;
}

const BOTH: DormerSides = { v: true, u: true };

/**
 * Pavilion roof over u0..u1 × v0..v1 from `eave` to `eave + rise`
 * (rise already at the style's pitch), eaves overhanging by `o` tiles.
 * Paints back slopes, the leaded flat, the front slopes, cresting and
 * finials, then dormers. Returns the canvas point of the flat's centre.
 */
export function pavilionRoof(p: IsoPainter, s: ArchStyle, u0: number, v0: number, u1: number, v1: number, eave: number, rise: number, color: number, o: number, sides: DormerSides = BOTH): Pt {
  const t = Math.min(u1 - u0, v1 - v0) * SLOPE_RUN + o;
  const top = eave + rise;
  const A = p.p(u0 - o, v0 - o, eave);
  const B = p.p(u1 + o, v0 - o, eave);
  const C = p.p(u1 + o, v1 + o, eave);
  const D = p.p(u0 - o, v1 + o, eave);
  const [ua, va, ub, vb] = [u0 - o + t, v0 - o + t, u1 + o - t, v1 + o - t];
  const a = p.p(ua, va, top);
  const b = p.p(ub, va, top);
  const c = p.p(ub, vb, top);
  const d = p.p(ua, vb, top);
  p.fillPoly([A, B, b, a], css(shade(color, baked(0.82))));
  p.normals.fill([A, B, b, a], p.slope(0, -1, t, rise));
  p.fillPoly([D, A, a, d], css(shade(color, baked(0.94))));
  p.normals.fill([D, A, a, d], p.slope(-1, 0, t, rise));
  // Leaded flat (seen from above) with its seams.
  const flat: Pt[] = [a, b, c, d];
  p.fillPoly(flat, css(shade(color, 1.18)));
  p.normals.fill(flat, N_UP);
  p.roofSlope([D, C, c, d], color, baked(1.05), p.slope(0, 1, t, rise), (k) => [lerp(d, D, k), lerp(c, C, k)]);
  p.roofSlope([C, B, b, c], color, baked(0.76), p.slope(1, 0, t, rise), (k) => [lerp(c, C, k), lerp(b, B, k)]);
  p.recordRoof(u0 - o, v0 - o, u1 + o, v1 + o, eave, [p.p(ua, va, 0), p.p(ub, va, 0), p.p(ub, vb, 0), p.p(ua, vb, 0)], top);
  const ctx = p.ctx;
  // Hip arrises in bright lead, the curb of the flat, cresting along its front edges.
  ctx.lineCap = 'round';
  ctx.strokeStyle = css(shade(color, 1.55), 0.85);
  ctx.lineWidth = 1.5;
  for (const [e0, e1] of [[C, c], [D, d], [B, b]] as const) {
    ctx.beginPath();
    ctx.moveTo(e0[0], e0[1]);
    ctx.lineTo(e1[0], e1[1]);
    ctx.stroke();
  }
  ctx.strokeStyle = css(shade(color, 0.45), 0.9);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(d[0], d[1]);
  ctx.lineTo(c[0], c[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  crestingRail(p, d, c);
  crestingRail(p, c, b);
  for (const q of [a, b, d]) epi(p, q[0], q[1] - 1, 2.6);
  epi(p, c[0], c[1] - 1, 3);
  if (s.ornaments.dormers) dormers(p, s, u0, v0, u1, v1, eave, rise, t, o, sides);
  return p.p((ua + ub) / 2, (va + vb) / 2, top);
}

/** Openwork lead cresting along a top edge (canvas points a → b). */
function crestingRail(p: IsoPainter, a: Pt, b: Pt): void {
  const ctx = p.ctx;
  const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 5));
  ctx.strokeStyle = 'rgba(52,56,64,.9)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1] - 3.2);
  ctx.lineTo(b[0], b[1] - 3.2);
  for (let i = 0; i <= n; i++) {
    const [x, y] = lerp(a, b, i / n);
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - (i % 2 ? 3.2 : 4.6));
  }
  ctx.stroke();
}

/** Oeil-de-boeuf dormers on the +v and +u slopes, a third of the way up, one per ~0.6 tile of eave. */
function dormers(p: IsoPainter, s: ArchStyle, u0: number, v0: number, u1: number, v1: number, eave: number, rise: number, t: number, o: number, sides: DormerSides): void {
  const f = 0.3;
  const z = eave + rise * f;
  const size = (span: number) => Math.min(13, 6 + span * 4);
  const run = (span: number) => Math.max(1, Math.round((span - 2 * t) / 0.55));
  const du = u1 - u0;
  const dv = v1 - v0;
  if (sides.v && du - 2 * t > 0.15) {
    const vd = v1 + o - t * f;
    const n = run(du);
    for (let i = 0; i < n; i++) {
      const uc = u0 - o + t + ((du + 2 * o - 2 * t) * (i + 0.5)) / n;
      const w = size(du) / 128;
      const h = size(du) * 1.5;
      p.normals.fill([p.p(uc - w, vd, z), p.p(uc + w, vd, z), p.p(uc + w, vd, z + h), p.p(uc - w, vd, z + h)], N_LEFT);
      p.leftFace(uc - w, uc + w, vd, z, (fw, fh) => oculusDormer(p, s, fw, fh, 1), h);
    }
  }
  if (sides.u && dv - 2 * t > 0.15) {
    const ud = u1 + o - t * f;
    const n = run(dv);
    for (let i = 0; i < n; i++) {
      const vc = v0 - o + t + ((dv + 2 * o - 2 * t) * (i + 0.5)) / n;
      const w = size(dv) / 128;
      const h = size(dv) * 1.5;
      p.normals.fill([p.p(ud, vc + w, z), p.p(ud, vc - w, z), p.p(ud, vc - w, z + h), p.p(ud, vc + w, z + h)], N_RIGHT);
      p.rightFace(vc - w, vc + w, ud, z, (fw, fh) => oculusDormer(p, s, fw, fh, 0.76), h);
    }
  }
}
