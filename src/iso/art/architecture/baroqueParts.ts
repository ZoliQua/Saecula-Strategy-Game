import { HW } from '../isoPainter';
import type { IsoPainter } from '../isoPainter';
import { N_LEFT } from '../lighting/viewSpace';
import { css, shade } from '../palette';
import { cornice, crest, pilasters, R } from './facade';
import type { ArchStyle } from './style';

type Pt = readonly [number, number];

/** Baked shade for details painted on right (+u) faces. */
export const RB = R;

type FaceDraw = (w: number, h: number, light: number) => void;

/**
 * Rendered baroque block: rusticated plinth (stone), plaster walls,
 * corner pilasters in the trim colour (plus `bays` inner ones; only
 * with the pilasters ornament) and a crowning cornice; `left` /
 * `right` paint openings in face-local coords (light = face shade).
 */
export function baroqueBlock(
  p: IsoPainter,
  s: ArchStyle,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  z0: number,
  z1: number,
  opts: { color?: number; bays?: number; left?: FaceDraw; right?: FaceDraw; plinth?: number },
): void {
  const c = s.palette;
  const color = opts.color ?? c.plaster;
  const plinth = opts.plinth ?? 10;
  if (plinth > 0) p.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, z0, z0 + plinth, { color: c.stone, detail: 'stone' }, c.stone);
  p.box(u0, v0, u1, v1, z0 + plinth, z1, { color });
  const h = z1 - z0 - plinth;
  const face = (w: number, light: number, draw: FaceDraw | undefined) => {
    const bays = Math.max(1, Math.round((opts.bays ?? 0) * (w / ((u1 - u0) * HW))));
    const xs = [4];
    for (let i = 1; i < bays; i++) xs.push((w * i) / bays);
    xs.push(w - 4);
    if (s.ornaments.pilasters) pilasters(p.ctx, h, xs, c.trim, 7, light);
    cornice(p.ctx, w, h - 6, c.trim, light, 7);
    draw?.(w, h, light);
  };
  p.leftFace(u0, u1, v1, z0 + plinth, (w) => face(w, 1, opts.left), h);
  p.rightFace(v0, v1, u1, z0 + plinth, (w) => face(w, RB, opts.right), h);
}

/**
 * Curved baroque street gable standing on the +v face (v) between u0
 * and u1 from height z: volutes rising to a capped centre, trim edge.
 */
export function volutedGable(p: IsoPainter, s: ArchStyle, u0: number, u1: number, v: number, z: number, rise: number, color = s.palette.plaster, team?: number): void {
  const shape = (t: number): number => {
    const d = Math.abs(t - 0.5) * 2; // 0 centre … 1 edge
    if (d > 0.92) return 0.08;
    if (d > 0.42) return 0.08 + 0.5 * (1 - (d - 0.42) / 0.5) ** 1.6 + 0.06 * Math.sin((1 - d) * 9);
    return 0.72 + 0.28 * Math.sqrt(Math.max(0, 1 - (d / 0.42) ** 2));
  };
  const n = 40;
  const top: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    top.push(p.p(u0 + (u1 - u0) * t, v, z + rise * shape(t)));
  }
  const pts: Pt[] = [p.p(u0, v, z), ...top, p.p(u1, v, z)];
  p.fillPoly(pts, css(color));
  p.normals.fill(pts, N_LEFT);
  const ctx = p.ctx;
  ctx.strokeStyle = css(s.palette.trim);
  ctx.lineWidth = 3;
  ctx.beginPath();
  top.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke();
  ctx.strokeStyle = css(shade(color, 0.6), 0.6);
  ctx.lineWidth = 1;
  ctx.stroke();
  // Oval window (ökörszem) / crest in the gable.
  p.leftFace(u0, u1, v, z, (w) => {
    if (team !== undefined) {
      crest(ctx, s, w / 2, -rise * 0.5, rise * 0.2, team);
      return;
    }
    ctx.fillStyle = css(s.palette.trim);
    ctx.beginPath();
    ctx.ellipse(w / 2, -rise * 0.48, 6.5, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    p.window(w / 2 - 4, -rise * 0.48 - 6, 8, 12, true);
  }, rise);
  p.addVolumePoint((u0 + u1) / 2, v, z + rise);
}

/** Triangular pediment over the +v face centre (barracks, stable portals). */
export function pediment(p: IsoPainter, s: ArchStyle, u0: number, u1: number, v: number, z: number, rise: number, team: number): void {
  const pts: Pt[] = [p.p(u0, v, z), p.p(u1, v, z), p.p((u0 + u1) / 2, v, z + rise)];
  p.fillPoly(pts, css(s.palette.plaster));
  p.normals.fill(pts, N_LEFT);
  p.strokePoly(pts, css(s.palette.trim), 3);
  p.leftFace(u0, u1, v, z, (w) => crest(p.ctx, s, w / 2, -rise * 0.38, rise * 0.24, team), rise);
}

/** Habsburg sentry box with black-yellow chevrons. */
export function sentryBox(p: IsoPainter, u: number, v: number): void {
  p.box(u, v, u + 0.24, v + 0.24, 0, 30, { color: 0xe8c240 });
  const stripes = (w: number, h: number) => {
    p.ctx.fillStyle = '#1e1a16';
    for (let y = 4; y < h; y += 8) {
      p.ctx.beginPath();
      p.ctx.moveTo(0, -y);
      p.ctx.lineTo(w / 2, -y - 4);
      p.ctx.lineTo(w, -y);
      p.ctx.lineTo(w, -y - 3);
      p.ctx.lineTo(w / 2, -y - 7);
      p.ctx.lineTo(0, -y - 3);
      p.ctx.fill();
    }
  };
  p.leftFace(u, u + 0.24, v + 0.24, 0, stripes, 30);
  p.rightFace(v, v + 0.24, u + 0.24, 0, stripes, 30);
  p.material = 'tile';
  p.hipRoof(u, v, u + 0.24, v + 0.24, 30, 12, 0x2c2a28, 0.04);
}

/** White-painted post-and-rail fence from (u0,v0) to (u1,v1). */
export function railFence(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, height = 14): void {
  const ctx = p.ctx;
  const n = Math.max(2, Math.round(Math.hypot(u1 - u0, v1 - v0) / 0.3));
  for (let i = 0; i <= n; i++) {
    const [x, y] = p.p(u0 + ((u1 - u0) * i) / n, v0 + ((v1 - v0) * i) / n, 0);
    ctx.fillStyle = '#efe8d8';
    ctx.fillRect(x - 1.3, y - height, 2.6, height);
  }
  for (const z of [height * 0.45, height * 0.9]) {
    const a = p.p(u0, v0, z);
    const b = p.p(u1, v1, z);
    ctx.strokeStyle = '#e6dfcd';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
}
