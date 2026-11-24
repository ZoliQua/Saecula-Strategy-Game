import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { pediment } from '../baroqueParts';
import { drumWall } from '../kits/drum';
import { column } from '../parts';
import { finial, helm, type HelmProfile } from '../roofs';
import type { ArchStyle } from '../style';

type Pt = readonly [number, number];

/*
 * Parts of the Akadémia (M17, akademia.ts): the domed drum with its
 * observatory cupola and telescope, the pedimented portico, and the
 * forecourt's parterres, yews and iron railing.
 */

/** The great dome over its drum: a tall lead dome (r in tiles at height z px above the drum). */
const DOME: HelmProfile = [[0, 0.43], [10, 0.42], [20, 0.39], [30, 0.33], [39, 0.24], [46, 0.13], [50, 0.05]];
/** The observatory's squat dome over its slit. */
const OBSERVATORY: HelmProfile = [[0, 0.11], [4, 0.105], [7, 0.085], [10, 0.05], [11.5, 0.01]];

/** Height of the drum and of the dome (art px), the observatory drum on top. */
export const DRUM_H = 40;
export const DOME_H = 50;
const OBS_H = 13;

/** A point on a drum's surface facing direction `a` (tile axes) at height z. */
function onDrum(p: IsoPainter, u: number, v: number, r: number, a: number, z: number): Pt {
  return p.p(u + r * Math.cos(a), v + r * Math.sin(a), z);
}

/**
 * The drum (pilasters between round-headed windows on its visible half),
 * the lead dome with gilt ribs, the observatory drum with its open slit,
 * its dome, a brass telescope and the team flag. Returns the top (px).
 */
export function domeAndObservatory(p: IsoPainter, s: ArchStyle, u: number, v: number, z: number, team: number): number {
  const c = s.palette;
  const ctx = p.ctx;
  const r = 0.42;
  drumWall(p, u, v, r + 0.03, z, z + 5, shade(c.ashlar, 0.92), 'ashlar');
  drumWall(p, u, v, r, z + 5, z + DRUM_H, c.ashlar, 'ashlar');
  // Pilasters and windows round the visible half (dark glazing: the drum lights the dome inside).
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 4 + 0.22 + (k / 6) * (Math.PI - 0.44);
    const facing = Math.cos(a) + Math.sin(a);
    const light = 0.78 + 0.2 * (Math.sin(a) - Math.cos(a)) / Math.SQRT2;
    const [x0, y0] = onDrum(p, u, v, r + 0.005, a, z + 5);
    const [, y1] = onDrum(p, u, v, r + 0.005, a, z + DRUM_H - 3);
    ctx.fillStyle = css(shade(c.trim, light));
    ctx.fillRect(x0 - 1.6, y1, 3.2, y0 - y1);
    if (k < 6) {
      const b = a + (Math.PI - 0.44) / 12;
      const [wx, wy] = onDrum(p, u, v, r + 0.005, b, z + 13);
      const ww = 2.4 + 1.4 * Math.max(0, facing) / Math.SQRT2;
      ctx.fillStyle = css(shade(c.trim, light));
      ctx.fillRect(wx - ww - 1, wy - 18, ww * 2 + 2, 19);
      ctx.fillStyle = css(shade(0x2a3038, light));
      ctx.beginPath();
      ctx.moveTo(wx - ww, wy);
      ctx.lineTo(wx - ww, wy - 14);
      ctx.arc(wx, wy - 14, ww, Math.PI, 0);
      ctx.lineTo(wx + ww, wy);
      ctx.fill();
    }
  }
  drumWall(p, u, v, r + 0.025, z + DRUM_H - 4, z + DRUM_H, c.trim, 'daub');
  const dz = z + DRUM_H;
  helm(p, u, v, dz, DOME, c.metal);
  // Gilt ribs running up the dome's front.
  for (const a of [-0.25, 0.55, 1.35]) {
    const ribPts = DOME.map(([hz, rr]) => onDrum(p, u, v, rr, Math.PI / 4 + a - 0.55, dz + hz));
    ctx.strokeStyle = 'rgba(222,190,98,.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ribPts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  }
  // The observatory: a white drum with a dark slit, a squat dome, a telescope.
  const oz = dz + DOME_H - 4;
  drumWall(p, u, v, 0.1, oz, oz + OBS_H, c.trim, 'daub');
  const [sx, sy] = onDrum(p, u, v, 0.105, Math.PI / 2 - 0.15, oz + 2);
  ctx.fillStyle = '#1a1c22';
  ctx.fillRect(sx - 2, sy - OBS_H + 2, 4, OBS_H - 3);
  helm(p, u, v, oz + OBS_H, OBSERVATORY, shade(c.metal, 1.15));
  const [tx, ty] = onDrum(p, u, v, 0.08, Math.PI / 2 - 0.15, oz + OBS_H + 2);
  ctx.strokeStyle = '#6b4f22';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(tx + 1, ty + 3);
  ctx.lineTo(tx - 13, ty - 9);
  ctx.stroke();
  ctx.strokeStyle = '#d6b25a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(tx + 1, ty + 2);
  ctx.lineTo(tx - 13, ty - 10);
  ctx.stroke();
  ctx.lineCap = 'butt';
  const top = oz + OBS_H + 11;
  finial(p, u, v, top, 8, false);
  p.flag(u, v, top + 6, 16, team);
  return top + 30;
}

/**
 * The portico on the +v face at vWall: steps, four columns, the
 * entablature, a small gable roof and the pediment bearing the crest.
 */
export function portico(p: IsoPainter, s: ArchStyle, u0: number, u1: number, vWall: number, depth: number, height: number, team: number): void {
  const c = s.palette;
  const v1 = vWall + depth;
  p.box(u0 - 0.06, vWall, u1 + 0.06, v1 + 0.1, 0, 3, { color: shade(c.stone, 0.95) }, c.stone);
  p.box(u0 - 0.03, vWall, u1 + 0.03, v1 + 0.04, 3, 7, { color: c.stone, detail: 'stone' }, shade(c.stone, 1.05));
  const n = 4;
  for (let i = 0; i < n; i++) {
    const u = u0 + 0.05 + ((u1 - u0 - 0.1) * i) / (n - 1);
    column(p, u, v1 - 0.04, 7, height, 3.4, c.trim);
  }
  p.box(u0, vWall, u1, v1, height, height + 8, { color: c.trim }, c.trim);
  p.material = 'slate';
  p.gableRoof(u0, vWall, u1, v1, height + 8, 18, c.roof, c.trim, 'v', 0.03);
  pediment(p, s, u0, u1, v1, height + 8, 18, team);
}

/** A clipped yew (cone of dark green) at (u, v). */
export function yew(p: IsoPainter, u: number, v: number, h: number): void {
  helm(p, u, v, 0, [[0, 0.06], [h * 0.3, 0.065], [h * 0.75, 0.035], [h, 0.005]], 0x3d5e2c, false);
}

/** A parterre bed: lawn inside a clipped box hedge, a yew at each corner. */
export function parterre(p: IsoPainter, u0: number, v0: number, u1: number, v1: number): void {
  p.box(u0, v0, u1, v1, 0, 3, { color: 0x45652e }, 0x4c6d33);
  p.ground(u0 + 0.05, v0 + 0.05, u1 - 0.05, v1 - 0.05, 0x6f8f46, 3);
  const ctx = p.ctx;
  const [a, b] = [p.p(u0 + 0.12, (v0 + v1) / 2, 3), p.p(u1 - 0.12, (v0 + v1) / 2, 3)];
  ctx.strokeStyle = css(0x3f5f2a);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
}

/** Wrought-iron railing on the +v edge from u0 to u1 at v, between stone piers (a gate gap from g0 to g1). */
export function railing(p: IsoPainter, s: ArchStyle, u0: number, u1: number, v: number, g0: number, g1: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  const run = (a: number, b: number) => {
    const n = Math.max(2, Math.round((b - a) / 0.07));
    ctx.strokeStyle = '#26282c';
    ctx.lineWidth = 1;
    for (let i = 0; i <= n; i++) {
      const u = a + ((b - a) * i) / n;
      const [x, y] = p.p(u, v, 2);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 15);
      ctx.stroke();
      ctx.fillStyle = '#c9a246';
      ctx.fillRect(x - 0.8, y - 17, 1.6, 2);
    }
    for (const z of [4, 13]) {
      const pa = p.p(a, v, z);
      const pb = p.p(b, v, z);
      ctx.beginPath();
      ctx.moveTo(pa[0], pa[1]);
      ctx.lineTo(pb[0], pb[1]);
      ctx.stroke();
    }
  };
  p.box(u0, v - 0.04, u1, v + 0.04, 0, 3, { color: c.stone }, c.stone);
  run(u0 + 0.06, g0);
  run(g1, u1 - 0.06);
  for (const u of [u0, g0, g1, u1 - 0.1]) {
    const tall = u === g0 || u === g1;
    p.box(u - 0.01, v - 0.05, u + 0.08, v + 0.05, 0, tall ? 24 : 16, { color: c.ashlar }, c.trim);
    const [x, y] = p.p(u + 0.035, v, tall ? 24 : 16);
    ctx.fillStyle = css(shade(c.trim, 0.95));
    ctx.beginPath();
    ctx.ellipse(x, y - 3, 2.4, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
