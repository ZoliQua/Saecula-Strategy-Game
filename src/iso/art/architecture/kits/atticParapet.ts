import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { baked } from '../../lighting/normalLayer';
import { N_UP } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import { R } from '../facade';
import type { ArchStyle } from '../style';

type Pt = readonly [number, number];

/*
 * Attic parapet kit (Central European Renaissance attyka): the main roof
 * sinks out of sight behind a tall parapet wall that runs round the
 * whole block. The wall carries a blind arcade of round-headed niches
 * and is crowned by a crest (grzebień) of small lunettes between
 * pinnacles, with taller pinnacles at the corners; from above, the low
 * hidden roof shows inside the parapet. Reached through RoofProfile.form
 * 'attic' (styledRoofs.ts), which turns a style's hips, gables and
 * mansards into attics, so a whole age reads by its flat, lacy roofline.
 */

/** Parapet wall thickness (tiles). */
const T = 0.05;

/** Whether the style hides its main roofs behind attic parapets. */
export function hasAtticRoofs(s: ArchStyle): boolean {
  return s.roof.form === 'attic';
}

/** Height (art px) of the parapet that stands in for a main roof of pitched `rise`. */
export function atticHeight(rise: number): number {
  return Math.max(11, Math.min(24, Math.round(rise * 0.9)));
}

/** Blind arcade of round-headed niches along a parapet face (face-local, width w, height h). */
function blindArcade(ctx: Ctx, w: number, h: number, wall: number, trim: number, light: number): void {
  // Cornice band at the foot of the attic.
  ctx.fillStyle = css(shade(trim, light * 1.02));
  ctx.fillRect(0, -3, w, 3);
  ctx.fillStyle = 'rgba(20,14,10,.3)';
  ctx.fillRect(0, 0, w, 1);
  const n = Math.max(2, Math.round(w / 11));
  const pitch = w / n;
  const nh = h - 8;
  if (nh < 4) return;
  for (let i = 0; i < n; i++) {
    const cx = pitch * (i + 0.5);
    const nw = Math.min(6, pitch * 0.55);
    ctx.fillStyle = css(shade(wall, light * 0.72));
    ctx.beginPath();
    ctx.moveTo(cx - nw / 2, -4);
    ctx.lineTo(cx - nw / 2, -4 - nh + nw / 2);
    ctx.arc(cx, -4 - nh + nw / 2, nw / 2, Math.PI, 0);
    ctx.lineTo(cx + nw / 2, -4);
    ctx.closePath();
    ctx.fill();
    // Pilaster strip between niches.
    if (i > 0) {
      ctx.fillStyle = css(shade(trim, light * 0.95), 0.85);
      ctx.fillRect(pitch * i - 0.8, -h + 2, 1.6, h - 5);
    }
  }
  // Coping along the top.
  ctx.fillStyle = css(shade(trim, light * 1.08));
  ctx.fillRect(0, -h, w, 2.2);
}

/** A pinnacle (small obelisk with a ball) standing at screen point (x, y), `h` px tall. */
function pinnacle(ctx: Ctx, x: number, y: number, h: number, color: number, light: number): void {
  const w = Math.max(1.6, h * 0.28);
  ctx.fillStyle = css(shade(color, light));
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.lineTo(x - w * 0.35, y - h * 0.82);
  ctx.lineTo(x + w * 0.35, y - h * 0.82);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y - h * 0.86, Math.max(1, w * 0.55), 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Crest along a parapet top from a to b (screen points): lunettes
 * between small pinnacles, taller pinnacles at both ends.
 */
function crest(ctx: Ctx, a: Pt, b: Pt, color: number, light: number, size: number): void {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(2, Math.round(len / 9));
  for (let i = 0; i < n; i++) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    const x0 = a[0] + (b[0] - a[0]) * t0;
    const y0 = a[1] + (b[1] - a[1]) * t0;
    const x1 = a[0] + (b[0] - a[0]) * t1;
    const y1 = a[1] + (b[1] - a[1]) * t1;
    // Lunette: a half disc standing on the coping.
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const r = Math.min(Math.hypot(x1 - x0, y1 - y0) * 0.36, size * 0.5);
    ctx.fillStyle = css(shade(color, light * 0.96));
    ctx.beginPath();
    ctx.ellipse(mx, my, r, r * 0.95, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(20,14,10,.28)';
    ctx.beginPath();
    ctx.arc(mx, my - r * 0.35, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    if (i > 0) pinnacle(ctx, x0, y0, size * 0.95, color, light);
  }
  pinnacle(ctx, a[0], a[1], size * 1.45, color, light * 1.04);
  pinnacle(ctx, b[0], b[1], size * 1.45, color, light * 1.04);
}

/**
 * Attic over a block (u0..u1, v0..v1) whose walls end at `eave`: back
 * parapets with their crests, the hidden roof inside, then the front
 * parapets with blind arcades and crests. Returns the attic's top centre.
 */
export function atticRoof(p: IsoPainter, s: ArchStyle, u0: number, v0: number, u1: number, v1: number, eave: number, rise: number, color: number): Pt {
  const c = s.palette;
  const ctx = p.ctx;
  const h = atticHeight(rise);
  const top = eave + h;
  const size = Math.max(4, Math.min(9, h * 0.42));
  const wall = c.plaster;
  const crestColour = c.trim;
  // Back parapets (their inner faces show).
  p.box(u0, v0, u1, v0 + T, eave, top, { color: shade(wall, 0.86) }, wall);
  p.box(u0, v0, u0 + T, v1, eave, top, { color: shade(wall, 0.86) }, wall);
  crest(ctx, p.p(u0, v1, top), p.p(u0, v0, top), crestColour, baked(0.86), size);
  crest(ctx, p.p(u0, v0, top), p.p(u1, v0, top), crestColour, baked(0.8), size);
  // The low roof hidden inside: two shallow slopes falling to a central gutter.
  const roofZ = eave + h * 0.45;
  const inner = [p.p(u0 + T, v0 + T, roofZ), p.p(u1 - T, v0 + T, roofZ), p.p(u1 - T, v1 - T, roofZ), p.p(u0 + T, v1 - T, roofZ)];
  p.fillPoly(inner, css(shade(color, baked(0.82))));
  p.normals.fill(inner, N_UP);
  ctx.strokeStyle = css(shade(color, 0.55), 0.7);
  ctx.lineWidth = 1;
  const um = (u0 + u1) / 2;
  const [gx0, gy0] = p.p(um, v0 + T, roofZ);
  const [gx1, gy1] = p.p(um, v1 - T, roofZ);
  ctx.beginPath();
  ctx.moveTo(gx0, gy0);
  ctx.lineTo(gx1, gy1);
  ctx.stroke();
  // Front parapets: blind arcades and crests.
  p.box(u0, v1 - T, u1, v1, eave, top, { color: wall }, wall);
  p.box(u1 - T, v0, u1, v1, eave, top, { color: wall }, wall);
  p.leftFace(u0, u1, v1, eave, (w, hh) => blindArcade(ctx, w, hh, wall, c.trim, 1), h);
  p.rightFace(v0, v1, u1, eave, (w, hh) => blindArcade(ctx, w, hh, wall, c.trim, R), h);
  crest(ctx, p.p(u0, v1, top), p.p(u1, v1, top), crestColour, 1.02, size);
  crest(ctx, p.p(u1, v1, top), p.p(u1, v0, top), crestColour, baked(0.78), size);
  p.recordRoof(u0, v0, u1, v1, eave, [p.p(um, (v0 + v1) / 2, 0)], top + size);
  return p.p(um, (v0 + v1) / 2, top);
}
