import { poly, type Ctx } from './canvas';
import { lerp } from './isoProps';
import { css, shade } from './palette';

type Pt = readonly [number, number];

/** Roof covering painted over a slope's base gradient. */
export type RoofMaterial = 'tile' | 'shingle' | 'thatch' | 'slate' | 'copper';

/** Row across the slope at t (0 = ridge, 1 = eave): start and end points. */
type RowAt = (t: number) => [Pt, Pt];

/**
 * Paints the cover texture of one roof slope, clipped to `pts`. The
 * slope's normal is painted by the caller; these are albedo details
 * only (they inherit the slope normal, plus the derived bump).
 */
export function paintRoofCover(
  ctx: Ctx,
  material: RoofMaterial,
  pts: Pt[],
  color: number,
  light: number,
  rowAt: RowAt,
  rand: () => number,
): void {
  ctx.save();
  poly(ctx, pts);
  ctx.clip();
  switch (material) {
    case 'tile':
      tiles(ctx, color, light, rowAt);
      break;
    case 'shingle':
      cells(ctx, color, light, rowAt, rand, 15, 18, 0.16);
      break;
    case 'slate':
      cells(ctx, color, light, rowAt, rand, 13, 16, 0.1);
      break;
    case 'thatch':
      thatch(ctx, color, light, rowAt, rand);
      break;
    case 'copper':
      copper(ctx, color, light, rowAt);
      break;
  }
  ctx.restore();
}

function line(ctx: Ctx, a: Pt, b: Pt): void {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
}

/** Curved clay tiles: course lines + staggered seams. */
function tiles(ctx: Ctx, color: number, light: number, rowAt: RowAt): void {
  const rows = 9;
  for (let i = 1; i < rows; i++) {
    const [s, e] = rowAt(i / rows);
    ctx.strokeStyle = css(shade(color, light * 0.55), 0.7);
    ctx.lineWidth = 1.3;
    line(ctx, s, e);
    const [ps, pe] = rowAt((i - 1) / rows);
    const n = 14;
    ctx.strokeStyle = css(shade(color, light * 0.7), 0.45);
    ctx.lineWidth = 0.8;
    for (let k = (i % 2) * 0.5; k < n; k++) {
      const t = k / n;
      line(ctx, lerp(ps, pe, t), lerp(s, e, t));
    }
  }
}

/** Wooden shingles / slates: a grid of slightly varied small plates. */
function cells(ctx: Ctx, color: number, light: number, rowAt: RowAt, rand: () => number, rows: number, n: number, vary: number): void {
  for (let i = 0; i < rows; i++) {
    const [ps, pe] = rowAt(i / rows);
    const [s, e] = rowAt((i + 1) / rows);
    const off = (i % 2) * 0.5;
    for (let k = -off; k < n; k++) {
      const t0 = Math.max(0, k / n);
      const t1 = Math.min(1, (k + 1) / n);
      const a = lerp(ps, pe, t0);
      const b = lerp(ps, pe, t1);
      const c = lerp(s, e, t1);
      const d = lerp(s, e, t0);
      poly(ctx, [a, b, c, d]);
      ctx.fillStyle = css(shade(color, light * (1 - vary + rand() * vary * 2)), 0.55);
      ctx.fill();
    }
    // Shadow line under each course.
    ctx.strokeStyle = css(shade(color, light * 0.45), 0.75);
    ctx.lineWidth = 1.1;
    line(ctx, s, e);
    ctx.strokeStyle = css(shade(color, light * 0.6), 0.5);
    ctx.lineWidth = 0.7;
    for (let k = off; k < n; k++) {
      const t = k / n;
      line(ctx, lerp(ps, pe, t), lerp(s, e, t));
    }
  }
}

/** Reed thatch: dense straw streaks down the slope, a few binding lines, thick eave. */
function thatch(ctx: Ctx, color: number, light: number, rowAt: RowAt, rand: () => number): void {
  const [r0s, r0e] = rowAt(0);
  const [r1s, r1e] = rowAt(1);
  for (let i = 0; i < 220; i++) {
    const t = rand();
    const a = lerp(r0s, r0e, t);
    const b = lerp(r1s, r1e, t + (rand() - 0.5) * 0.01);
    const t0 = rand() * 0.85;
    const len = 0.12 + rand() * 0.3;
    const p0 = lerp(a, b, t0);
    const p1 = lerp(a, b, Math.min(1.02, t0 + len));
    ctx.strokeStyle = css(shade(color, light * (0.62 + rand() * 0.6)), 0.55);
    ctx.lineWidth = 0.9 + rand() * 0.8;
    line(ctx, p0, p1);
  }
  for (const t of [0.33, 0.66]) {
    const [s, e] = rowAt(t);
    ctx.strokeStyle = css(shade(color, light * 0.5), 0.45);
    ctx.lineWidth = 2;
    line(ctx, s, e);
  }
  // Thick, darker eave lip.
  const [s, e] = rowAt(0.94);
  ctx.strokeStyle = css(shade(color, light * 0.55), 0.8);
  ctx.lineWidth = 5;
  line(ctx, s, e);
}

/** Copper sheet: standing seams from ridge to eave plus a sheen band. */
function copper(ctx: Ctx, color: number, light: number, rowAt: RowAt): void {
  const [r0s, r0e] = rowAt(0);
  const [r1s, r1e] = rowAt(1);
  const n = 12;
  for (let k = 1; k < n; k++) {
    const t = k / n;
    ctx.strokeStyle = css(shade(color, light * 1.25), 0.55);
    ctx.lineWidth = 1;
    line(ctx, lerp(r0s, r0e, t), lerp(r1s, r1e, t));
  }
  for (const t of [0.5]) {
    const [s, e] = rowAt(t);
    ctx.strokeStyle = css(shade(color, light * 0.8), 0.4);
    ctx.lineWidth = 0.8;
    line(ctx, s, e);
  }
}
