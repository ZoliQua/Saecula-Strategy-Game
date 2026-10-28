import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import type { ArchStyle } from '../style';

/*
 * Half-timber kit (shared by civs that frame their storeys): the lattice
 * patterns, framed gables and leaded mullioned windows. The framing
 * school picks the carpentry: 'tudor' (English black-and-white close
 * studding and magpie work) or 'alemannic' (German Fachwerk: storey
 * rails, K-braces at the corner posts and Mann figures in the bays).
 * Face-local helpers draw inside IsoPainter.leftFace / rightFace (x
 * along the wall, y up as negative values).
 */

/** 'close': close studding with a mid rail; 'square': square panels with diagonal and cross braces (magpie work). */
export type FramePattern = 'close' | 'square';

/** Carpentry school of the framing (ArchStyle.kits.framing). */
export type FrameSchool = 'tudor' | 'alemannic';

/** Timber lattice over a whitewashed face of width w and height h, in the school's carpentry. */
export function halfTimberLattice(ctx: Ctx, w: number, h: number, color: number, pattern: FramePattern, light = 1, school: FrameSchool = 'tudor'): void {
  if (school === 'alemannic') {
    alemannicLattice(ctx, w, h, color, pattern, light);
    return;
  }
  const c = css(shade(color, light));
  const beam = 3.4;
  ctx.fillStyle = c;
  ctx.fillRect(0, -beam, w, beam);
  ctx.fillRect(0, -h, w, beam + 0.6);
  ctx.fillRect(0, -h, beam + 0.4, h);
  ctx.fillRect(w - beam - 0.4, -h, beam + 0.4, h);
  ctx.strokeStyle = c;
  ctx.lineCap = 'butt';
  if (pattern === 'close') {
    const rail = h * 0.42;
    ctx.fillRect(0, -rail - 1.6, w, 3.2);
    const gap = 6.4;
    for (let x = gap; x < w - gap * 0.6; x += gap) ctx.fillRect(x - 1.15, -h, 2.3, h);
    // Curved tension braces in the end bays of the lower tier.
    ctx.lineWidth = 2.4;
    for (const [x0, x1] of [[beam, gap * 2.6], [w - beam, w - gap * 2.6]] as const) {
      ctx.beginPath();
      ctx.moveTo(x0, -rail);
      ctx.quadraticCurveTo(x0 + (x1 - x0) * 0.2, -beam - 2, x1, -beam);
      ctx.stroke();
    }
    return;
  }
  const bays = Math.max(2, Math.round(w / 17));
  const bay = w / bays;
  const rails = [h / 3, (h * 2) / 3];
  for (const r of rails) ctx.fillRect(0, -r - 1.4, w, 2.8);
  for (let i = 1; i < bays; i++) ctx.fillRect(i * bay - 1.4, -h, 2.8, h);
  ctx.lineWidth = 2.2;
  for (let i = 0; i < bays; i++) {
    const x0 = i * bay + 1.5;
    const x1 = (i + 1) * bay - 1.5;
    // Lower tier: diagonal braces leaning outward; upper tier: St Andrew's crosses in every other bay.
    ctx.beginPath();
    if (i < bays / 2) {
      ctx.moveTo(x0, -beam);
      ctx.lineTo(x1, -rails[0]!);
    } else {
      ctx.moveTo(x1, -beam);
      ctx.lineTo(x0, -rails[0]!);
    }
    if (i % 2 === 0) {
      ctx.moveTo(x0, -rails[1]!);
      ctx.lineTo(x1, -h + beam);
      ctx.moveTo(x1, -rails[1]!);
      ctx.lineTo(x0, -h + beam);
    } else {
      // Quatrefoil-ish curved braces.
      const cx = (x0 + x1) / 2;
      const cy = -(rails[1]! + h) / 2;
      ctx.moveTo(x0, cy);
      ctx.quadraticCurveTo(cx, cy, cx, -rails[1]!);
      ctx.moveTo(x1, cy);
      ctx.quadraticCurveTo(cx, cy, cx, -h + beam);
    }
    ctx.stroke();
  }
}

/** A brace (diagonal timber) of width `t` from (x0, y0) to (x1, y1). */
function brace(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, t: number): void {
  ctx.lineWidth = t;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

/**
 * Alemannic Fachwerk: sill, top plate and two storey rails; corner
 * posts carry K-braces, and the bays alternate a Mann figure (a centre
 * post with long foot braces and short head braces) with plain window
 * bays ('close' packs the Mann figures tighter than 'square').
 */
function alemannicLattice(ctx: Ctx, w: number, h: number, color: number, pattern: FramePattern, light: number): void {
  const c = css(shade(color, light));
  const beam = 3.6;
  ctx.fillStyle = c;
  ctx.strokeStyle = c;
  ctx.lineCap = 'butt';
  ctx.fillRect(0, -beam, w, beam);
  ctx.fillRect(0, -h, w, beam + 0.8);
  const sill = h * 0.4;
  const lintel = h * 0.78;
  ctx.fillRect(0, -sill - 1.4, w, 2.8);
  ctx.fillRect(0, -lintel - 1.3, w, 2.6);
  const bays = Math.max(2, Math.round(w / (pattern === 'close' ? 15 : 19)));
  const bay = w / bays;
  for (let i = 0; i <= bays; i++) ctx.fillRect(Math.min(w - beam, Math.max(0, i * bay - 1.5)), -h, i === 0 || i === bays ? beam : 3, h);
  // K-braces at both corner posts.
  for (const [x, dir] of [[beam, 1], [w - beam, -1]] as const) {
    brace(ctx, x, -sill, x + dir * bay * 0.8, -beam, 2.6);
    brace(ctx, x, -sill, x + dir * bay * 0.8, -lintel, 2.6);
  }
  for (let i = 1; i < bays - 1; i++) {
    if (i % 2 === 0) continue;
    const x0 = i * bay;
    const cx = x0 + bay / 2;
    // Mann: centre post, legs from the sill corners, arms up to the top plate.
    ctx.fillRect(cx - 1.3, -h, 2.6, h);
    brace(ctx, x0 + 1.5, -beam, cx, -lintel + 2, 2.5);
    brace(ctx, x0 + bay - 1.5, -beam, cx, -lintel + 2, 2.5);
    brace(ctx, cx, -lintel - 1, x0 + bay * 0.12, -h + beam, 2.2);
    brace(ctx, cx, -lintel - 1, x0 + bay * 0.88, -h + beam, 2.2);
  }
}

/**
 * Framed gable (gableRoof detail): king post, collar, close studs and a
 * dark carved bargeboard along the rakes, clipped to the triangle.
 */
export function gableTimber(ctx: Ctx, w: number, rise: number, color: number, light = 1, school: FrameSchool = 'tudor'): void {
  if (school === 'alemannic') {
    alemannicGable(ctx, w, rise, color, light);
    return;
  }
  const c = css(shade(color, light));
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w / 2, -rise);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = c;
  ctx.fillRect(0, -3, w, 3);
  const collar = rise * 0.45;
  ctx.fillRect(0, -collar - 1.5, w, 3);
  ctx.fillRect(w / 2 - 1.6, -rise, 3.2, rise);
  for (let x = 6.5; x < w; x += 6.5) ctx.fillRect(x - 1.1, -collar, 2.2, collar);
  ctx.strokeStyle = c;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(w / 2, -collar);
  ctx.lineTo(w * 0.3, -rise * 0.7);
  ctx.moveTo(w / 2, -collar);
  ctx.lineTo(w * 0.7, -rise * 0.7);
  ctx.stroke();
  // Bargeboards: a thick dark band hugging both rakes.
  ctx.lineWidth = 5;
  ctx.strokeStyle = css(shade(color, light * 1.2));
  ctx.beginPath();
  ctx.moveTo(-1, 1);
  ctx.lineTo(w / 2, -rise - 1);
  ctx.lineTo(w + 1, 1);
  ctx.stroke();
  ctx.restore();
}

/** Alemannic gable: collar and king post, a large Mann figure in the lower triangle, a thin bargeboard. */
function alemannicGable(ctx: Ctx, w: number, rise: number, color: number, light: number): void {
  const c = css(shade(color, light));
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w / 2, -rise);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = c;
  ctx.strokeStyle = c;
  ctx.fillRect(0, -3.4, w, 3.4);
  const collar = rise * 0.5;
  ctx.fillRect(0, -collar - 1.5, w, 3);
  ctx.fillRect(w / 2 - 1.5, -rise, 3, rise);
  for (const x of [w * 0.25, w * 0.75]) ctx.fillRect(x - 1.3, -collar, 2.6, collar);
  brace(ctx, w * 0.06, -3, w / 2, -collar + 1, 2.6);
  brace(ctx, w * 0.94, -3, w / 2, -collar + 1, 2.6);
  brace(ctx, w / 2, -collar - 2, w * 0.36, -rise * 0.72, 2.2);
  brace(ctx, w / 2, -collar - 2, w * 0.64, -rise * 0.72, 2.2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = css(shade(color, light * 0.85));
  ctx.beginPath();
  ctx.moveTo(-1, 1);
  ctx.lineTo(w / 2, -rise - 1);
  ctx.lineTo(w + 1, 1);
  ctx.stroke();
  ctx.restore();
}

/** The style's carpentry school (default 'tudor'). */
export function frameSchool(s: ArchStyle): FrameSchool {
  return s.kits?.framing ?? 'tudor';
}

/** Timber framing on a face in the style's school, when the style frames its storeys (halfTimber ornament). */
export function styleFraming(ctx: Ctx, s: ArchStyle, w: number, h: number, pattern: FramePattern, light = 1): void {
  if (s.ornaments.halfTimber) halfTimberLattice(ctx, w, h, s.palette.timber, pattern, light, frameSchool(s));
}

/** The gable fill a framed style uses (framing only with the halfTimber ornament). */
export function framedGable(ctx: Ctx, s: ArchStyle, light = 1): ((w: number, rise: number) => void) | undefined {
  return s.ornaments.halfTimber ? (w, rise) => gableTimber(ctx, w, rise, s.palette.timber, light, frameSchool(s)) : undefined;
}

/**
 * Leaded mullioned window: oak frame, `lights` lights split by
 * mullions, diamond quarries and a drip mould above. Records the glow.
 */
export function leadedWindow(p: IsoPainter, x: number, y: number, w: number, h: number, lights = 2, light = 1): void {
  const ctx = p.ctx;
  p.window(x, y, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = 'rgba(38,28,20,.6)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let d = -h; d < w; d += 3.4) {
    ctx.moveTo(x + d, y);
    ctx.lineTo(x + d + h * 0.7, y + h);
    ctx.moveTo(x + d + h * 0.7, y);
    ctx.lineTo(x + d, y + h);
  }
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = css(shade(0x2a221c, light));
  for (let k = 1; k < lights; k++) ctx.fillRect(x + (w * k) / lights - 1, y, 2, h);
  ctx.fillRect(x - 2.5, y - 3.2, w + 5, 2.2);
}
