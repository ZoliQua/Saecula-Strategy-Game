import type { Ctx } from '../../canvas';
import type { IsoPainter, WallStyle } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import type { Block } from './lowHip';

/*
 * Insula kit: the Roman (and later Italian) multi-storey town block — a
 * ground storey of arched shops (tabernae) with stone counters, upper
 * storeys of small windows divided by stone string courses, and a
 * wooden balcony (maenianum) along a storey. Face-local helpers paint
 * inside IsoPainter.leftFace / rightFace callbacks.
 */

/** Arched shop opening (taberna) at x, w wide, h tall, its arch in `trim`, a counter across the foot. */
export function taberna(ctx: Ctx, x: number, w: number, h: number, trim: number, light: number): void {
  const r = w / 2;
  ctx.fillStyle = css(shade(trim, light));
  ctx.beginPath();
  ctx.moveTo(x - 2.5, 0);
  ctx.lineTo(x - 2.5, -h + r);
  ctx.arc(x + r, -h + r, r + 2.5, Math.PI, 0);
  ctx.lineTo(x + w + 2.5, 0);
  ctx.closePath();
  ctx.fill();
  const g = ctx.createLinearGradient(0, -h, 0, 0);
  g.addColorStop(0, css(shade(0x241811, light)));
  g.addColorStop(1, css(shade(0x4a3626, light)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, -h + r);
  ctx.arc(x + r, -h + r, r, Math.PI, 0);
  ctx.lineTo(x + w, 0);
  ctx.closePath();
  ctx.fill();
  // Counter and the keystone.
  ctx.fillStyle = css(shade(trim, light * 0.92));
  ctx.fillRect(x, -7, w, 7);
  ctx.fillStyle = css(shade(trim, light * 0.7));
  ctx.fillRect(x, -7.8, w, 0.8);
  ctx.fillStyle = css(shade(trim, light * 1.06));
  ctx.fillRect(x + r - 1.6, -h - 2.5, 3.2, 3.5);
}

/** Stone string course along a face at height y (face-local, positive up). */
export function stringCourse(ctx: Ctx, w: number, y: number, trim: number, light: number, depth = 2.6): void {
  ctx.fillStyle = css(shade(trim, light * 1.04));
  ctx.fillRect(0, -y - depth, w, depth);
  ctx.fillStyle = 'rgba(30,20,10,.28)';
  ctx.fillRect(0, -y, w, 1.1);
}

/** Small shuttered (unlit) window: dark opening behind two closed leaves. */
export function shutteredDark(ctx: Ctx, x: number, y: number, w: number, h: number, shutter: number, light: number): void {
  ctx.fillStyle = css(shade(0x2a1d14, light));
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = css(shade(shutter, light));
  ctx.fillRect(x, y, w / 2 - 0.4, h);
  ctx.fillRect(x + w / 2 + 0.4, y, w / 2 - 0.4, h);
  ctx.fillStyle = css(shade(shutter, light * 0.65));
  for (let k = 2; k < h; k += 2.6) ctx.fillRect(x, y + k, w, 0.6);
}

export interface InsulaOpts {
  /** Finish of the ground storey (brick, rusticated stone). */
  readonly ground: WallStyle;
  /** Finish of the upper storeys; default the ground's. */
  readonly upper?: WallStyle;
  /** Arches, counters and string courses. */
  readonly trim: number;
  /** Closed window leaves. */
  readonly shutter: number;
  /** Storey height (art px). */
  readonly storey: number;
  readonly storeys: number;
  /** Shop bays on the +v (left) and +u (right) faces; 0 leaves the ground storey closed. */
  readonly shops: readonly [left: number, right: number];
  /** Windows per upper storey on the left and right faces. */
  readonly windows: readonly [left: number, right: number];
  /**
   * Upper storeys whose windows are lit (from the first upper storey); the
   * rest stay shuttered. A pair sets the left and right faces apart (light
   * only storeys that show, e.g. above a lower wing). Default 1.
   */
  readonly lit?: number | readonly [left: number, right: number];
}

/** One face of an insula (face-local): shops below, string courses, windows above. */
function insulaFace(p: IsoPainter, o: InsulaOpts, w: number, light: number, shops: number, windows: number, lit: number): void {
  const ctx = p.ctx;
  const st = o.storey;
  if (shops > 0) {
    const bay = w / shops;
    for (let i = 0; i < shops; i++) taberna(ctx, i * bay + bay * 0.2, bay * 0.6, st * 0.78, o.trim, light);
  }
  for (let k = 1; k < o.storeys; k++) {
    stringCourse(ctx, w, k * st, o.trim, light);
    if (windows <= 0) continue;
    const bay = w / windows;
    const ww = Math.min(9, bay * 0.42);
    for (let i = 0; i < windows; i++) {
      const x = i * bay + (bay - ww) / 2;
      const y = -(k + 1) * st + 6;
      if (k <= lit) p.window(x, y, ww, st * 0.48, true);
      else shutteredDark(ctx, x, y, ww, st * 0.42, o.shutter, light);
    }
  }
}

/** Lit upper storeys of a face (0 left, 1 right). */
function litOf(o: InsulaOpts, face: 0 | 1): number {
  const lit = o.lit ?? 1;
  return typeof lit === 'number' ? lit : lit[face];
}

/** Multi-storey block on `b` from z0; returns its top. Extra face painters run after the insula's own. */
export function insula(p: IsoPainter, b: Block, z0: number, o: InsulaOpts, left?: (w: number, h: number) => void, right?: (w: number, h: number) => void): number {
  const [u0, v0, u1, v1] = b;
  const top = z0 + o.storey * o.storeys;
  const upper = o.upper ?? o.ground;
  p.box(u0, v0, u1, v1, z0, z0 + o.storey, o.ground);
  p.box(u0, v0, u1, v1, z0 + o.storey, top, upper, shade(upper.color, 0.9));
  p.leftFace(u0, u1, v1, z0, (w, h) => {
    insulaFace(p, o, w, 1, o.shops[0], o.windows[0], litOf(o, 0));
    left?.(w, h);
  }, top - z0);
  p.rightFace(v0, v1, u1, z0, (w, h) => {
    insulaFace(p, o, w, R, o.shops[1], o.windows[1], litOf(o, 1));
    right?.(w, h);
  }, top - z0);
  return top;
}

/**
 * Wooden balcony (maenianum) along the +v face of a block, u0..u1, its
 * floor at z, standing `depth` tiles out on brackets, with a rail.
 */
export function balcony(p: IsoPainter, u0: number, u1: number, v: number, z: number, depth: number, wood: number): void {
  const ctx = p.ctx;
  p.box(u0, v, u1, v + depth, z - 2.5, z, { color: shade(wood, 0.85) }, wood);
  // Brackets under the floor.
  ctx.strokeStyle = css(shade(wood, 0.6));
  ctx.lineWidth = 1.6;
  for (let u = u0 + 0.08; u < u1; u += 0.3) {
    const a = p.p(u, v, z - 10);
    const b = p.p(u, v + depth, z - 2.5);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  // Posts, rail and balusters.
  ctx.strokeStyle = css(shade(wood, 1.05));
  ctx.lineWidth = 1.4;
  for (let u = u0 + 0.02; u <= u1; u += 0.1) {
    const a = p.p(u, v + depth, z);
    const b = p.p(u, v + depth, z + 9);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  const r0 = p.p(u0, v + depth, z + 9);
  const r1 = p.p(u1, v + depth, z + 9);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(r0[0], r0[1]);
  ctx.lineTo(r1[0], r1[1]);
  ctx.stroke();
  p.addVolumePoint(u0, v + depth, z + 9);
  p.addVolumePoint(u1, v + depth, z + 9);
}
