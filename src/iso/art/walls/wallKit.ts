import { HW, type IsoPainter } from '../isoPainter';
import type { UV } from './prism';

/*
 * Shared vocabulary of the wall styles (wallStyles.ts, english/): the
 * arm and style shapes, evenly spaced stations along an arm, and the
 * soft ground shadows under arms and posts.
 */

/** One arm of a wall piece: from `a` (post face or tile centre) to the shared edge / corner `b`. */
export interface Arm {
  /** Thickness factor: 45° runs are built thicker so they still read when seen end-on. */
  readonly girth: number;
  readonly a: UV;
  readonly b: UV;
  /** Length from the tile centre to `b` (tiles). */
  readonly full: number;
  readonly diagonal: boolean;
}

export interface WallAgeStyle {
  /** Half the post's footprint edge (tiles). */
  readonly postHalf: number;
  /** Height of the post's top, where the banner pole stands (art px). */
  readonly postTop: number;
  /** Soft contact shadow under an arm (painted first). */
  shadow(p: IsoPainter, arm: Arm): void;
  arm(p: IsoPainter, arm: Arm): void;
  /** `arms` = the joined neighbour bits (corner towers vs. run piers). */
  post(p: IsoPainter, arms: number): void;
  /** Paint on CPU-backed canvases (cheaper normal derive and trim read-backs). */
  readonly readback?: boolean;
}

/**
 * Evenly spaced points along an arm, counted from its far end so the
 * rhythm (stakes, merlons) carries on across the tile edge into the
 * neighbour; points closer than `clear` to the arm's start are skipped.
 * Sorted back to front.
 */
export function stations(arm: Arm, spacing: number, clear = 0): UV[] {
  const n = Math.max(1, Math.round(arm.full / spacing));
  const step = arm.full / n;
  const len = Math.hypot(arm.b[0] - arm.a[0], arm.b[1] - arm.a[1]);
  const du = (arm.a[0] - arm.b[0]) / (len || 1);
  const dv = (arm.a[1] - arm.b[1]) / (len || 1);
  const out: UV[] = [];
  for (let d = step / 2; d < len - clear; d += step) out.push([arm.b[0] + du * d, arm.b[1] + dv * d]);
  return out.sort((x, y) => x[0] + x[1] - (y[0] + y[1]));
}

/** A short piece of the arm's line centred on `c` (for merlons, cordons). */
export function along(arm: Arm, c: UV, halfLen: number): [UV, UV] {
  const len = Math.hypot(arm.b[0] - arm.a[0], arm.b[1] - arm.a[1]) || 1;
  const du = ((arm.b[0] - arm.a[0]) / len) * halfLen;
  const dv = ((arm.b[1] - arm.a[1]) / len) * halfLen;
  return [[c[0] - du, c[1] - dv], [c[0] + du, c[1] + dv]];
}

export function contactShadow(p: IsoPainter, arm: Arm, half: number): void {
  const ctx = p.ctx;
  const a = p.p(arm.a[0], arm.a[1], 0);
  const b = p.p(arm.b[0], arm.b[1], 0);
  ctx.save();
  ctx.filter = 'blur(3px)';
  ctx.strokeStyle = 'rgba(14,20,10,0.32)';
  ctx.lineWidth = half * HW * 2.2;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(a[0], a[1] + 2);
  ctx.lineTo(b[0], b[1] + 2);
  ctx.stroke();
  ctx.restore();
}

export function postShadow(p: IsoPainter, half: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(0.5, 0.5, 0);
  ctx.save();
  ctx.filter = 'blur(3px)';
  ctx.fillStyle = 'rgba(14,20,10,0.35)';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 2, half * HW * 1.9, half * HW, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
