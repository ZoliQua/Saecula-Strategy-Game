import { HW, type IsoPainter } from '../../isoPainter';
import { baked } from '../../lighting/normalLayer';
import { css, shade } from '../../palette';
import { helm } from '../roofs';
import type { ArchStyle } from '../style';

type Pt = readonly [number, number];

/*
 * Onion dome kit: a turned bulb that swells past its drum and draws in
 * to a pointed ogee tip, on an optional round drum with dark slit
 * windows and a ring of kokoshnik arches, crowned by a gilt three-bar
 * cross. The bulb can be plain (gilt or painted), striped in gores,
 * twisted in a spiral or banded in chevrons. Styles switch the baroque
 * family's onions on with kits.onionDomes.
 */

/** Whether the style crowns its skyline spots with onion domes. */
export function hasOnionDomes(s: ArchStyle): boolean {
  return s.kits?.onionDomes === true;
}

export type OnionPattern = 'plain' | 'stripes' | 'spiral' | 'chevron';

export interface OnionOpts {
  /** Main colour of the bulb (gold leaf, painted tin, glazed tile). */
  readonly color: number;
  /** Second colour of a patterned bulb. */
  readonly alt?: number;
  readonly pattern?: OnionPattern;
  /** Drum under the bulb: height (art px) and colour; absent = the bulb sits on a short neck. */
  readonly drum?: { readonly h: number; readonly color: number };
  /** Ring of kokoshnik arches round the drum's foot, in this colour. */
  readonly kokoshnik?: number;
  /** Bulb height relative to its width (1 = the kit's own proportion). */
  readonly tall?: number;
  /** Gilt cross on the tip; default true. */
  readonly cross?: boolean;
}

/** Widest bulb radius (× drum radius). */
const BULGE = 1.5;

/** Bulb radius (× drum radius) at height t (0 neck … 1 tip). */
function bulb(t: number): number {
  if (t < 0.34) return 0.8 + 0.7 * Math.sin((t / 0.34) * (Math.PI / 2));
  const s = (t - 0.34) / 0.66;
  return BULGE * Math.pow(Math.cos(s * (Math.PI / 2)), 1.6);
}

/** Pixel radius of a circle of r tiles on screen (its ellipse half-width). */
export const ringPx = (r: number): number => r * Math.SQRT2 * HW;

/** Bulb height (art px) of an onion on a drum of r tiles. */
export function bulbHeight(r: number, tall = 1): number {
  return ringPx(r) * 3.5 * tall;
}

/** Height (art px) an onion of radius r adds above its foot: drum, bulb and cross. */
export function onionHeight(r: number, o: Pick<OnionOpts, 'drum' | 'tall' | 'cross'> = {}): number {
  return (o.drum?.h ?? 0) + bulbHeight(r, o.tall) + (o.cross === false ? 0 : crossSize(r));
}

const crossSize = (r: number): number => Math.max(9, Math.min(22, ringPx(r) * 1.05));

/** A point on a ring of half-width w round (x, yc) at angle th (0 = towards the viewer). */
const onRing = (x: number, yc: number, w: number, th: number): Pt => [x + w * Math.sin(th), yc + w * 0.5 * Math.cos(th)];

const HALF = Math.PI / 2;
const clampTh = (th: number): number => Math.max(-HALF, Math.min(HALF, th));

/** Gilt three-bar (Orthodox) cross standing at canvas point (x, y), `size` px tall. */
export function orthodoxCross(p: IsoPainter, x: number, y: number, size: number): void {
  const ctx = p.ctx;
  const t = Math.max(1.2, size * 0.09);
  ctx.fillStyle = '#7a5a1c';
  ctx.fillRect(x - t / 2 + 0.6, y - size, t, size);
  ctx.fillStyle = '#e8c45a';
  ctx.fillRect(x - t / 2, y - size, t, size);
  ctx.fillRect(x - size * 0.16, y - size * 0.86, size * 0.32, t * 0.9);
  ctx.fillRect(x - size * 0.3, y - size * 0.68, size * 0.6, t);
  ctx.save();
  ctx.translate(x, y - size * 0.32);
  ctx.rotate(-0.38);
  ctx.fillRect(-size * 0.2, -t / 2, size * 0.4, t * 0.9);
  ctx.restore();
  p.normalCylinder(x - size * 0.3, y - size, size * 0.6, size);
}

/** Round drum of r tiles from z to z + h: dark slit lights and a cornice ring. */
export function onionDrum(p: IsoPainter, uc: number, vc: number, r: number, z: number, h: number, color: number): void {
  helm(p, uc, vc, z, [[0, r], [h, r]], color, false);
  const ctx = p.ctx;
  const [x, y0] = p.p(uc, vc, z);
  const w = ringPx(r);
  if (h >= 10) {
    for (const th of [-1.05, 0, 1.05]) {
      const k = Math.cos(th);
      const [sx, sy] = onRing(x, y0 - h * 0.25, w, th);
      const sw = Math.max(1.2, w * 0.18 * k);
      ctx.fillStyle = css(shade(0x241a14, 0.9 + 0.2 * k));
      ctx.fillRect(sx - sw / 2, sy - h * 0.5, sw, h * 0.5);
      ctx.beginPath();
      ctx.arc(sx, sy - h * 0.5, sw / 2, Math.PI, 0);
      ctx.fill();
    }
  }
  ctx.strokeStyle = css(shade(color, 0.55), 0.8);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(x, y0 - h, w, w * 0.5, 0, 0, Math.PI);
  ctx.stroke();
}

/** Ring of ogee (kokoshnik) gables round a drum's foot, front half only. */
export function kokoshnikRing(p: IsoPainter, uc: number, vc: number, r: number, z: number, h: number, color: number): void {
  const ctx = p.ctx;
  const [x, y0] = p.p(uc, vc, z);
  const w = ringPx(r) * 1.08;
  const ths = [-1.2, -0.6, 0, 0.6, 1.2].sort((a, b) => Math.cos(a) - Math.cos(b));
  for (const th of ths) {
    const k = Math.cos(th);
    const [ax, ay] = onRing(x, y0, w, th);
    const hw = Math.max(2.5, w * 0.36 * (0.45 + 0.55 * k));
    const top = ay - h;
    const l = baked(0.8 + 0.25 * k - 0.15 * Math.sin(th));
    ctx.fillStyle = css(shade(color, l));
    ctx.beginPath();
    ctx.moveTo(ax - hw, ay);
    ctx.lineTo(ax - hw, ay - h * 0.45);
    ctx.bezierCurveTo(ax - hw, ay - h * 0.95, ax - hw * 0.15, ay - h * 0.7, ax, top);
    ctx.bezierCurveTo(ax + hw * 0.15, ay - h * 0.7, ax + hw, ay - h * 0.95, ax + hw, ay - h * 0.45);
    ctx.lineTo(ax + hw, ay);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = css(shade(color, 0.5), 0.7);
    ctx.lineWidth = 0.9;
    ctx.stroke();
    // Recessed tympanum.
    ctx.fillStyle = css(shade(color, l * 0.72));
    ctx.beginPath();
    ctx.arc(ax, ay - h * 0.42, hw * 0.55, Math.PI, 0);
    ctx.lineTo(ax + hw * 0.55, ay - 1);
    ctx.lineTo(ax - hw * 0.55, ay - 1);
    ctx.fill();
  }
  p.addVolumePoint(uc, vc, z + h);
}

/** Outline of the bulb (closed polygon) and its widest half-width. */
function outline(x: number, y0: number, w: number, H: number): { pts: Pt[]; maxW: number } {
  const n = 28;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    left.push([x - w * bulb(t), y0 - t * H]);
    right.unshift([x + w * bulb(t), y0 - t * H]);
  }
  const base = w * bulb(0);
  const arc: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI;
    arc.push([x + Math.cos(a) * base, y0 + Math.sin(a) * base * 0.5]);
  }
  return { pts: [...left, ...right, ...arc], maxW: w * BULGE };
}

/** One band of the bulb between two curves th0(t) and th1(t), t from t0 to t1. */
function band(x: number, y0: number, w: number, H: number, t0: number, t1: number, th0: (t: number) => number, th1: (t: number) => number): Pt[] {
  const n = 18;
  const a: Pt[] = [];
  const b: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + ((t1 - t0) * i) / n;
    const wt = w * bulb(t);
    a.push(onRing(x, y0 - t * H, wt, clampTh(th0(t))));
    b.unshift(onRing(x, y0 - t * H, wt, clampTh(th1(t))));
  }
  return [...a, ...b];
}

function patternBands(x: number, y0: number, w: number, H: number, pattern: OnionPattern): Pt[][] {
  const out: Pt[][] = [];
  if (pattern === 'stripes' || pattern === 'spiral') {
    const gores = 10;
    const twist = pattern === 'spiral' ? 2.6 : 0;
    for (let k = 0; k < gores; k += 2) {
      const a = -Math.PI + (k * 2 * Math.PI) / gores;
      const b = a + (2 * Math.PI) / gores;
      for (const off of [0, 2 * Math.PI, -2 * Math.PI]) {
        out.push(band(x, y0, w, H, 0, 0.97, (t) => a + off + twist * t, (t) => b + off + twist * t));
      }
    }
  } else if (pattern === 'chevron') {
    for (let j = 0; j < 5; j++) {
      const t0 = 0.06 + j * 0.15;
      const zig = (t: number, th: number) => t + 0.035 * Math.cos(th * 6);
      const pts: Pt[] = [];
      const back: Pt[] = [];
      for (let i = 0; i <= 24; i++) {
        const th = -HALF + (i / 24) * Math.PI;
        const ta = zig(t0, th);
        const tb = zig(t0 + 0.065, th);
        pts.push(onRing(x, y0 - ta * H, w * bulb(ta), th));
        back.unshift(onRing(x, y0 - tb * H, w * bulb(tb), th));
      }
      out.push([...pts, ...back]);
    }
  }
  return out;
}

/** The bulb alone on (uc, vc, z), r tiles at its neck's drum; returns the tip's height. */
export function onionBulb(p: IsoPainter, uc: number, vc: number, r: number, z: number, o: OnionOpts): number {
  const ctx = p.ctx;
  const [x, y0] = p.p(uc, vc, z);
  const w = ringPx(r);
  const H = bulbHeight(r, o.tall);
  const { pts, maxW } = outline(x, y0, w, H);
  const g = ctx.createLinearGradient(x - maxW, 0, x + maxW, 0);
  g.addColorStop(0, css(shade(o.color, 1.2)));
  g.addColorStop(0.32, css(shade(o.color, 1.05)));
  g.addColorStop(0.78, css(shade(o.color, baked(0.62))));
  g.addColorStop(1, css(shade(o.color, baked(0.48))));
  p.fillPoly(pts, g);
  p.normals.cylinderPoly(pts, x - maxW, maxW * 2);
  ctx.save();
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
  ctx.closePath();
  ctx.clip();
  const alt = o.alt;
  if (alt !== undefined && o.pattern && o.pattern !== 'plain') {
    ctx.fillStyle = css(alt);
    for (const b of patternBands(x, y0, w, H, o.pattern)) {
      ctx.beginPath();
      b.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
      ctx.closePath();
      ctx.fill();
    }
    // Re-shade the painted bands as one round body.
    const s = ctx.createLinearGradient(x - maxW, 0, x + maxW, 0);
    s.addColorStop(0, 'rgba(255,255,255,0.16)');
    s.addColorStop(0.4, 'rgba(255,255,255,0)');
    s.addColorStop(0.75, 'rgba(10,8,20,0.28)');
    s.addColorStop(1, 'rgba(10,8,20,0.45)');
    ctx.fillStyle = s;
    ctx.fillRect(x - maxW, y0 - H - 2, maxW * 2, H + w + 4);
  }
  // Specular sheen on the lit shoulder.
  const hx = x - maxW * 0.42;
  const hy = y0 - H * 0.3;
  const sh = ctx.createRadialGradient(hx, hy, 0.5, hx, hy, maxW * 0.6);
  sh.addColorStop(0, css(shade(o.color, 1.7), 0.6));
  sh.addColorStop(1, css(shade(o.color, 1.7), 0));
  ctx.fillStyle = sh;
  ctx.fillRect(x - maxW, y0 - H, maxW * 2, H);
  ctx.restore();
  p.strokePoly(pts, css(shade(o.color, 0.38), 0.7), 1);
  const rBulge = r * BULGE;
  for (const [du, dv] of [[1, 0], [0, 1], [-1, 0], [0, -1]] as const) p.addVolumePoint(uc + du * rBulge, vc + dv * rBulge, z + H * 0.3);
  p.addVolumePoint(uc, vc, z + H);
  return z + H;
}

/**
 * Onion dome on (uc, vc, z), r tiles at the drum: drum (optional, with
 * kokoshniki at its foot), bulb and cross. Returns the top of the cross.
 */
export function onionDome(p: IsoPainter, uc: number, vc: number, r: number, z: number, o: OnionOpts): number {
  let zb = z;
  if (o.drum) {
    onionDrum(p, uc, vc, r, z, o.drum.h, o.drum.color);
    if (o.kokoshnik !== undefined) kokoshnikRing(p, uc, vc, r, z, Math.min(o.drum.h * 0.55, ringPx(r) * 0.9), o.kokoshnik);
    zb = z + o.drum.h;
  }
  const tip = onionBulb(p, uc, vc, r, zb, o);
  if (o.cross === false) return tip;
  const size = crossSize(r);
  const [x, y] = p.p(uc, vc, tip);
  orthodoxCross(p, x, y + 1, size);
  p.addVolumePoint(uc, vc, tip + size);
  return tip + size;
}
