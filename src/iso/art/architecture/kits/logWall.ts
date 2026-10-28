import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';

/*
 * Log-wall kit: northern log building. A box of horizontal round logs
 * whose ends cross and stick out at the corners (saddle-notched, "v
 * oblo"), and the steep plank gable roof of a log house with carved
 * bargeboards, a hanging carved towel board under the apex and a carved
 * horse-head ridge log. The log courses are 8 art px, matching the
 * painter's 'logs' wall detail.
 */

const COURSE = 8;
/** End grain of a sawn log. */
const END_GRAIN = 0xd8b88a;

/** One protruding log end from corner point (u, v, z) out along (du, dv) tiles. */
function logEnd(p: IsoPainter, u: number, v: number, z: number, du: number, dv: number, color: number): void {
  const ctx = p.ctx;
  const a = p.p(u, v, z);
  const b = p.p(u + du, v + dv, z);
  ctx.lineCap = 'butt';
  ctx.strokeStyle = css(shade(color, 0.78));
  ctx.lineWidth = COURSE - 1.2;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.strokeStyle = css(shade(color, 1.12), 0.7);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1] - 2.2);
  ctx.lineTo(b[0], b[1] - 2.2);
  ctx.stroke();
  ctx.fillStyle = css(shade(END_GRAIN, 0.95));
  ctx.beginPath();
  ctx.ellipse(b[0], b[1], 2.3, (COURSE - 1.4) / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = css(shade(color, 0.5), 0.8);
  ctx.lineWidth = 0.7;
  ctx.stroke();
}

/**
 * Log box from z0 to z1 with crossed log ends at its three visible
 * corners (front, left, right); `ends` 0 leaves plain corners (a log
 * wall continuing behind another block). Returns the face polygons.
 */
export function logBox(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, z0: number, z1: number, color: number, ends = 0.08): ReturnType<IsoPainter['box']> {
  const faces = p.box(u0, v0, u1, v1, z0, z1, { color, detail: 'logs' });
  if (ends <= 0) return faces;
  for (let z = z0 + COURSE / 2, k = 0; z < z1 - 1; z += COURSE, k++) {
    if (k % 2 === 0) {
      // Logs of the +v (left) face run out past both of its corners.
      logEnd(p, u0, v1, z, -ends, 0, color);
      logEnd(p, u1, v1, z, ends, 0, color);
    } else {
      // Logs of the +u (right) face run out past both of its corners.
      logEnd(p, u1, v0, z, 0, -ends, color);
      logEnd(p, u1, v1, z, 0, ends, color);
    }
  }
  return faces;
}

/** Carved window surround (nalichnik) with a pointed crown, face-local, around a w×h window at (x, y). */
export function nalichnik(ctx: Ctx, x: number, y: number, w: number, h: number, color: number, light = 1): void {
  ctx.fillStyle = css(shade(color, light));
  ctx.fillRect(x - 2.5, y - 1.5, w + 5, h + 4);
  ctx.beginPath();
  ctx.moveTo(x - 4, y - 1);
  ctx.quadraticCurveTo(x + w / 2, y - 3, x + w / 2, y - 9);
  ctx.quadraticCurveTo(x + w / 2, y - 3, x + w + 4, y - 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - 3.5, y + h + 1.5, w + 7, 2);
}

export interface CarvedGableOpts {
  /** Bargeboards, towel board and horse head. */
  readonly carving: number;
  /** Log courses in the gable triangle (else boards). */
  readonly logs?: boolean;
  /** A lit attic window (svetyolka) in the gable. */
  readonly window?: boolean;
  /** The carved horse-head on the ridge log's front end. */
  readonly horse?: boolean;
}

/** The gable triangle's face-local fill: log courses or vertical boards, and the attic light. */
function gableFill(p: IsoPainter, wall: number, o: CarvedGableOpts): (w: number, rise: number) => void {
  return (w, rise) => {
    const ctx = p.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w / 2, -rise);
    ctx.lineTo(w, 0);
    ctx.closePath();
    ctx.clip();
    if (o.logs) {
      for (let y = 0; y < rise; y += COURSE) {
        ctx.fillStyle = css(shade(wall, 1.2), 0.45);
        ctx.fillRect(0, -y - 7.5, w, 1.6);
        ctx.fillStyle = css(shade(wall, 0.6), 0.6);
        ctx.fillRect(0, -y - 1.2, w, 1.2);
      }
    } else {
      for (let x = 2; x < w; x += 5) {
        ctx.fillStyle = css(shade(wall, 0.65), 0.5);
        ctx.fillRect(x, -rise, 0.9, rise);
      }
    }
    ctx.restore();
    if (o.window) {
      const ww = Math.min(9, w * 0.14);
      nalichnik(ctx, w / 2 - ww / 2, -rise * 0.42, ww, ww * 1.1, o.carving);
      p.window(w / 2 - ww / 2, -rise * 0.42, ww, ww * 1.1);
    }
  };
}

/** Bargeboards with scalloped lower edges, the towel board and the horse head, face-local. */
function carvings(ctx: Ctx, w: number, rise: number, o: CarvedGableOpts, light: number): void {
  const c = css(shade(o.carving, light));
  const dark = css(shade(o.carving, light * 0.5), 0.8);
  const ext = 7;
  const k = (2 * rise) / w;
  const board = 4.5;
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -ext : w + ext;
    const y0 = ext * k;
    const x1 = w / 2;
    const y1 = -rise;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x1, y1 + board * 1.6);
    ctx.lineTo(x0, y0 + board * 1.6);
    ctx.closePath();
    ctx.fill();
    // Scalloped drops along the lower edge.
    const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 6));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t + board * 1.6;
      ctx.beginPath();
      ctx.arc(x, y, 1.9, 0, Math.PI);
      ctx.fill();
    }
    ctx.strokeStyle = dark;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  // Towel board (polotentse) hanging from the apex, with a cut-out sun and a toothed foot.
  const tw = Math.max(5, w * 0.08);
  const th = rise * 0.34;
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(w / 2 - tw / 2, -rise + 2);
  ctx.lineTo(w / 2 + tw / 2, -rise + 2);
  ctx.lineTo(w / 2 + tw / 2, -rise + th);
  ctx.lineTo(w / 2, -rise + th + tw * 0.7);
  ctx.lineTo(w / 2 - tw / 2, -rise + th);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(w / 2, -rise + th * 0.55, tw * 0.22, 0, Math.PI * 2);
  ctx.fill();
  if (o.horse) {
    // Horse-head (konyok) at the ridge log's end: arched neck, head looking out, ear.
    const x = w / 2;
    const y = -rise;
    ctx.fillStyle = css(shade(o.carving, light * 0.82));
    ctx.beginPath();
    ctx.moveTo(x - 2.5, y + 2);
    ctx.quadraticCurveTo(x - 4.5, y - 7, x - 1, y - 12);
    ctx.lineTo(x + 1.5, y - 15);
    ctx.lineTo(x + 2.5, y - 12.5);
    ctx.lineTo(x + 7.5, y - 9.5);
    ctx.lineTo(x + 6.5, y - 7);
    ctx.lineTo(x + 2.5, y - 8);
    ctx.quadraticCurveTo(x + 1, y - 4, x + 3, y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
}

/**
 * Steep plank gable roof (ridge along `axis`) with a carved gable end
 * facing the viewer: log or board gable fill, bargeboards, towel board,
 * attic light and ridge horse. The caller sets the painter's material.
 */
export function carvedGableRoof(
  p: IsoPainter,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  eave: number,
  rise: number,
  roof: number,
  wall: number,
  axis: 'u' | 'v',
  o: CarvedGableOpts,
  overhang = 0.12,
): void {
  p.gableRoof(u0, v0, u1, v1, eave, rise, roof, wall, axis, overhang, gableFill(p, wall, o));
  if (axis === 'v') p.leftFace(u0, u1, v1, eave, (w) => carvings(p.ctx, w, rise, o, 1));
  else p.rightFace(v0, v1, u1, eave, (w) => carvings(p.ctx, w, rise, o, 0.78));
  if (o.horse) p.addVolumePoint(axis === 'v' ? (u0 + u1) / 2 : u1, axis === 'v' ? v1 : (v0 + v1) / 2, eave + rise + 14);
}
