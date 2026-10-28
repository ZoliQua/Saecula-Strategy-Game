import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { carvedGableRoof, logBox, nalichnik, type CarvedGableOpts } from '../kits/logWall';
import { onionDome } from '../kits/onionDome';
import { octPrism, tentRoof } from '../kits/tentRoof';
import { post } from '../parts';
import type { ArchStyle, LogTownKits } from '../style';

/*
 * Pieces of the Russian log town (izba family): log blocks and white
 * stone ground storeys, carved plank gables, shuttered windows in carved
 * frames, square timber towers with a fighting gallery (oblam), and the
 * octagon-and-tent tops that age 2 puts on them.
 */

export type Block = readonly [u0: number, v0: number, u1: number, v1: number];
type FaceDraw = (w: number, h: number) => void;

/**
 * Radius (tiles) of the single onions on age-2 tower tops: a bulb about
 * 26 art px wide, above the ~25 px below which small domes vanish at
 * zoom 1 (Task 6 m1).
 */
export const TOWER_ONION = 0.095;

const FIRST_AGE: LogTownKits = { masonry: 'log', tents: false, onions: false, civic: 'hillfort' };

/** The style's log-town reading; absent = the first-age reading (all logs, plank gables). */
export function logTown(s: ArchStyle): LogTownKits {
  return s.kits?.logTown ?? FIRST_AGE;
}

/** Log block with crossed corner ends; face painters in face-local coords. */
export function logBlock(p: IsoPainter, s: ArchStyle, b: Block, z0: number, z1: number, left?: FaceDraw, right?: FaceDraw, ends = 0.08): void {
  const [u0, v0, u1, v1] = b;
  logBox(p, u0, v0, u1, v1, z0, z1, s.palette.darkWood, ends);
  if (left) p.leftFace(u0, u1, v1, z0, left, z1 - z0);
  if (right) p.rightFace(v0, v1, u1, z0, right, z1 - z0);
}

/** Whitewashed stone block (age-2 ground storeys, kremlin towers) with a moulded band under the top. */
export function stoneBlock(p: IsoPainter, s: ArchStyle, b: Block, z0: number, z1: number, left?: FaceDraw, right?: FaceDraw): void {
  const [u0, v0, u1, v1] = b;
  const c = s.palette.ashlar;
  p.box(u0, v0, u1, v1, z0, z1, { color: c, detail: 'plaster' }, c);
  const band = (light: number) => (w: number, h: number) => {
    p.ctx.fillStyle = css(shade(c, light * 0.82));
    p.ctx.fillRect(0, -h + 4, w, 2.4);
    p.ctx.fillStyle = css(shade(c, light * 1.08));
    p.ctx.fillRect(0, -h + 6.4, w, 1.2);
  };
  p.leftFace(u0, u1, v1, z0, (w, h) => {
    band(1)(w, h);
    left?.(w, h);
  }, z1 - z0);
  p.rightFace(v0, v1, u1, z0, (w, h) => {
    band(R)(w, h);
    right?.(w, h);
  }, z1 - z0);
}

/** The ground storey of a hall: low log footing in age 1, a white-stone storey (podklet) in age 2. Returns its top. */
export function footing(p: IsoPainter, s: ArchStyle, b: Block, tall: number, left?: FaceDraw, right?: FaceDraw): number {
  if (logTown(s).masonry === 'whiteStone') {
    stoneBlock(p, s, b, 0, tall, left, right);
    return tall;
  }
  const [u0, v0, u1, v1] = b;
  p.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 6, { color: s.palette.stone, detail: 'fieldstone' }, s.palette.stone);
  return 6;
}

/** Steep plank gable over a block, gable end carved, ridge along `axis`. */
export function plankGable(p: IsoPainter, s: ArchStyle, b: Block, eave: number, rise: number, axis: 'u' | 'v', o: Partial<CarvedGableOpts> = {}): void {
  const [u0, v0, u1, v1] = b;
  const prev = p.material;
  p.material = 'shingle';
  carvedGableRoof(p, u0, v0, u1, v1, eave, rise, s.palette.roof, s.palette.darkWood, axis, { carving: s.palette.board, logs: true, horse: true, ...o });
  p.material = prev;
}

/** Shuttered window in a carved frame (face-local); `lit` records a glow. */
export function izbaWindow(p: IsoPainter, s: ArchStyle, x: number, y: number, w: number, h: number, light: number, lit = true): void {
  const ctx = p.ctx;
  nalichnik(ctx, x, y, w, h, s.palette.board, light);
  ctx.fillStyle = css(shade(s.palette.shutter, light));
  ctx.fillRect(x - w * 0.55 - 2.5, y, w * 0.5, h);
  ctx.fillRect(x + w + 2.5, y, w * 0.5, h);
  if (lit) p.window(x, y, w, h);
  else {
    ctx.fillStyle = css(shade(0x2a2018, light));
    ctx.fillRect(x, y, w, h);
  }
}

/** Overhanging timber fighting gallery (oblam) on a square shaft, loopholes on both faces. */
export function oblam(p: IsoPainter, s: ArchStyle, b: Block, z: number, h: number, out = 0.07): Block {
  const [u0, v0, u1, v1] = b;
  const g: Block = [u0 - out, v0 - out, u1 + out, v1 + out];
  p.box(g[0], g[1], g[2], g[3], z, z + h, { color: s.palette.timber, detail: 'planks' }, s.palette.timber);
  const loops = (w: number) => {
    p.ctx.fillStyle = '#17110b';
    for (let x = 6; x < w - 5; x += 11) p.ctx.fillRect(x, -h + 5, 3, 7);
  };
  p.leftFace(g[0], g[2], g[3], z, loops, h);
  p.rightFace(g[1], g[3], g[2], z, loops, h);
  // Brackets under the overhang.
  for (const t of [0.15, 0.5, 0.85]) {
    const [x, y] = p.p(u0 + (u1 - u0) * t, v1, z);
    p.ctx.fillStyle = css(shade(s.palette.timber, 0.7));
    p.ctx.fillRect(x - 1.2, y - 1, 2.4, 7);
  }
  return g;
}

/**
 * Tower top of the age: a steep four-sided plank hip (age 1), or an
 * octagon carrying a green tent roof (age 2), with an onion on top when
 * the style has onions. Returns the top height.
 */
export function towerTop(p: IsoPainter, s: ArchStyle, b: Block, z: number, opts: { hip?: number; oct?: number; tent?: number; onion?: number } = {}): number {
  const [u0, v0, u1, v1] = b;
  const uc = (u0 + u1) / 2;
  const vc = (v0 + v1) / 2;
  const k = logTown(s);
  const prev = p.material;
  if (!k.tents) {
    p.material = 'shingle';
    p.hipRoof(u0, v0, u1, v1, z, opts.hip ?? 46, s.palette.roof, 0.08);
    p.material = prev;
    finialPole(p, uc, vc, z + (opts.hip ?? 46));
    return z + (opts.hip ?? 46) + 10;
  }
  const r = Math.min(u1 - u0, v1 - v0) * 0.42;
  const octH = opts.oct ?? 18;
  // Low hipped shoulders of the square below the octagon.
  p.material = 'shingle';
  p.hipRoof(u0, v0, u1, v1, z, 10, s.palette.roofAlt, 0.06);
  p.material = prev;
  octPrism(p, uc, vc, r, z + 6, z + 6 + octH, s.palette.ashlar, 'stone', (w, h, light) => {
    p.ctx.fillStyle = css(shade(0x241a14, light));
    p.ctx.fillRect(w / 2 - 1.5, -h * 0.75, 3, h * 0.5);
  });
  const apex = tentRoof(p, uc, vc, r, z + 6 + octH, opts.tent ?? 64, s.palette.roofAlt, { material: 'tile', ribs: shade(s.palette.roofAlt, 1.35), lights: true });
  if (!k.onions || opts.onion === 0) return apex;
  return onionDome(p, uc, vc, opts.onion ?? TOWER_ONION, apex - 4, { color: s.palette.metal });
}

/** Thin pole with a small gilt-free knob on a hip apex (age-1 tower tops). */
export function finialPole(p: IsoPainter, u: number, v: number, z: number): void {
  const [x, y] = p.p(u, v, z);
  p.ctx.fillStyle = '#4a3622';
  p.ctx.fillRect(x - 0.8, y - 10, 1.6, 10);
  p.ctx.beginPath();
  p.ctx.arc(x, y - 10, 2, 0, Math.PI * 2);
  p.ctx.fill();
}

/** Pole fence (zherdi): posts with two horizontal poles. */
export function poleFence(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, h = 12): void {
  const ctx = p.ctx;
  const n = Math.max(2, Math.round(Math.hypot(u1 - u0, v1 - v0) / 0.32));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    post(p, u0 + (u1 - u0) * t, v0 + (v1 - v0) * t, 0, h + 2, 1.3, 0x5e4430);
  }
  for (const z of [h * 0.45, h]) {
    const a = p.p(u0, v0, z);
    const b = p.p(u1, v1, z);
    ctx.strokeStyle = '#8a6a48';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
}

/** Haystack on a pole (stog): a tall cone of hay with the pole sticking out. */
export function stog(p: IsoPainter, u: number, v: number, r: number, h: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  ctx.strokeStyle = '#4d321b';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.5);
  ctx.lineTo(x, y - h - 9);
  ctx.stroke();
  const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, '#e6c56c');
  g.addColorStop(0.5, '#c99f4a');
  g.addColorStop(1, '#8a6a2c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.bezierCurveTo(x - r * 1.1, y - h * 0.45, x - r * 0.3, y - h * 0.9, x, y - h);
  ctx.bezierCurveTo(x + r * 0.3, y - h * 0.9, x + r * 1.1, y - h * 0.45, x + r, y);
  ctx.quadraticCurveTo(x, y + r * 0.35, x - r, y);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,64,24,.45)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 10; i++) {
    const t = (i / 9) * 2 - 1;
    ctx.beginPath();
    ctx.moveTo(x + t * r * 0.95, y - 1);
    ctx.quadraticCurveTo(x + t * r * 0.7, y - h * 0.55, x + t * r * 0.08, y - h * 0.97);
    ctx.stroke();
  }
  p.normalCylinder(x - r, y - h, r * 2, h);
  p.addVolumePoint(u, v, h);
}

/** Row of sharpened log stakes standing at height z from (u0,v0) to (u1,v1). */
export function stakeRow(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, z: number, height: number, color: number, step = 0.08): void {
  const ctx = p.ctx;
  const n = Math.max(1, Math.round(Math.hypot(u1 - u0, v1 - v0) / step));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [x, y] = p.p(u0 + (u1 - u0) * t, v0 + (v1 - v0) * t, z);
    const h = height * (0.92 + p.random() * 0.16);
    const r = 3.2;
    const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
    g.addColorStop(0, css(shade(color, 1.15)));
    g.addColorStop(1, css(shade(color, 0.6)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - r, y + 2);
    ctx.lineTo(x - r, y - h);
    ctx.lineTo(x, y - h - 6);
    ctx.lineTo(x + r, y - h);
    ctx.lineTo(x + r, y + 2);
    ctx.closePath();
    ctx.fill();
    p.normalCylinder(x - r, y - h - 6, r * 2, h + 6);
  }
  const a = p.p(u0, v0, z + height * 0.7);
  const b = p.p(u1, v1, z + height * 0.7);
  ctx.strokeStyle = 'rgba(40,26,14,.75)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  for (const [u, v] of [[u0, v0], [u1, v1]] as const) p.addVolumePoint(u, v, z + height);
}
