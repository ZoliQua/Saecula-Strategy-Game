import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import type { ArchStyle } from '../style';

/*
 * Tudor black-and-white framing: the lattice patterns, framed gables,
 * jettied (overhanging) upper storeys and leaded mullioned windows.
 * Face-local helpers draw inside IsoPainter.leftFace / rightFace (x
 * along the wall, y up as negative values).
 */

/** 'close': close studding with a mid rail; 'square': square panels with diagonal and cross braces (magpie work). */
export type FramePattern = 'close' | 'square';

/** Black-and-white timber lattice over a whitewashed face of width w and height h. */
export function halfTimberLattice(ctx: Ctx, w: number, h: number, color: number, pattern: FramePattern, light = 1): void {
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

/**
 * Framed gable (gableRoof detail): king post, collar, close studs and a
 * dark carved bargeboard along the rakes, clipped to the triangle.
 */
export function gableTimber(ctx: Ctx, w: number, rise: number, color: number, light = 1): void {
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

/** The gable fill a Tudor style uses (framing only with the halfTimber ornament). */
export function framedGable(ctx: Ctx, s: ArchStyle, light = 1): ((w: number, rise: number) => void) | undefined {
  return s.ornaments.halfTimber ? (w, rise) => gableTimber(ctx, w, rise, s.palette.timber, light) : undefined;
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

/**
 * Jettied upper storey: whitewashed box overhanging the storey below by
 * `jetty` tiles on both visible sides, framed in `pattern`, with a dark
 * bressumer beam and the overhang's shadow baked onto the wall beneath.
 * `left` / `right` paint windows on the faces (face-local, after the frame).
 */
export function jettyStorey(
  p: IsoPainter,
  s: ArchStyle,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  z0: number,
  z1: number,
  jetty: number,
  pattern: FramePattern,
  left?: (w: number, h: number) => void,
  right?: (w: number, h: number) => void,
): void {
  const c = s.palette;
  const ctx = p.ctx;
  const shadowBand = (w: number) => {
    const g = ctx.createLinearGradient(0, -9, 0, 0);
    g.addColorStop(0, 'rgba(20,14,10,.5)');
    g.addColorStop(1, 'rgba(20,14,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, -9, w, 9);
  };
  p.leftFace(u0, u1, v1, z0 - 9, shadowBand, 9);
  p.rightFace(v0, v1, u1, z0 - 9, shadowBand, 9);
  const U = u1 + jetty;
  const V = v1 + jetty;
  p.box(u0, v0, U, V, z0, z1, { color: c.plaster, detail: 'plaster' });
  const frame = (light: number, paint?: (w: number, h: number) => void) => (w: number, h: number) => {
    if (s.ornaments.halfTimber) halfTimberLattice(ctx, w, h, c.timber, pattern, light);
    // Bressumer with joist ends.
    ctx.fillStyle = css(shade(c.timber, light * 1.1));
    ctx.fillRect(0, -5, w, 5);
    ctx.fillStyle = css(shade(c.timber, light * 1.7));
    for (let x = 3; x < w - 2; x += 7) ctx.fillRect(x, -3.4, 2.4, 2.2);
    paint?.(w, h);
  };
  p.leftFace(u0, U, V, z0, frame(1, left), z1 - z0);
  p.rightFace(v0, V, U, z0, frame(R, right), z1 - z0);
}
