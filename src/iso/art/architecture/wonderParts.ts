import { HW, type IsoPainter } from '../isoPainter';
import { css, shade } from '../palette';
import { OCHRE, VERDIGRIS, WHITE_TRIM } from './baroqueParts';
import { finial, helm, type HelmProfile } from './roofs';

/*
 * Pieces of the Wonder (a Hungarian baroque basilica): the domed
 * crossing, onion-helmed façade towers, statues, and the timber
 * scaffolding / crane shown while it is being built.
 */

const TIMBER = '#8a6238';
const TIMBER_DARK = '#5e4024';

/** Tall façade-tower helm: bell, lantern, onion, needle (tiles / art px). */
export const BASILICA_HELM: HelmProfile = [
  [0, 0.27], [7, 0.28], [16, 0.24], [24, 0.15], [28, 0.09], [31, 0.09], [32, 0.12], [46, 0.12],
  [48, 0.08], [52, 0.1], [59, 0.14], [66, 0.11], [73, 0.05], [82, 0.015],
];

const DOME: HelmProfile = [
  [0, 0.6], [10, 0.59], [20, 0.55], [30, 0.47], [39, 0.37], [46, 0.26], [51, 0.15], [54, 0.06], [55, 0.03],
];
const LANTERN: HelmProfile = [[0, 0.12], [15, 0.12], [17, 0.15], [19, 0.08], [25, 0.05], [30, 0.01]];

/** Windows and pilasters painted across the visible half of a cylinder (drum, lantern). */
function cylinderBays(p: IsoPainter, u: number, v: number, z: number, r: number, h: number, n: number, glazed: boolean): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, z);
  const rx = r * Math.SQRT2 * HW;
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n) * Math.PI;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const wx = x - c * rx;
    const wy = y + s * rx * 0.5;
    const w = Math.max(1, 6.5 * s);
    ctx.fillStyle = css(shade(WHITE_TRIM, 0.75 + 0.3 * (1 - (c + 1) / 2)));
    ctx.fillRect(wx - w / 2 - 2, wy - h + 4, w + 4, h - 6);
    if (glazed) p.window(wx - w / 2, wy - h + 8, w, h - 14, true);
  }
}

/** Domed crossing: drum with windows, cornice ring, ribbed copper dome, lantern and cross. */
export function dome(p: IsoPainter, u: number, v: number, z: number, done: boolean): void {
  helm(p, u, v, z, [[0, 0.64], [8, 0.64]], WHITE_TRIM, false);
  helm(p, u, v, z + 8, [[0, 0.58], [40, 0.58]], OCHRE, false);
  cylinderBays(p, u, v, z + 8, 0.58, 40, 7, true);
  helm(p, u, v, z + 48, [[0, 0.63], [6, 0.63]], WHITE_TRIM, false);
  if (!done) {
    domeCentring(p, u, v, z + 54);
    return;
  }
  helm(p, u, v, z + 54, DOME, VERDIGRIS);
  helm(p, u, v, z + 108, LANTERN, VERDIGRIS);
  const [lx, ly] = p.p(u, v, z + 116);
  p.ctx.fillStyle = '#16120e';
  for (const dx of [-5.5, -1, 3.5]) p.ctx.fillRect(lx + dx, ly - 6, 2.5, 8);
  finial(p, u, v, z + 138, 26);
}

/** Timber centring of the dome before the copper goes on: ribs and rings. */
function domeCentring(p: IsoPainter, u: number, v: number, z: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, z);
  const R = 0.6 * Math.SQRT2 * HW;
  ctx.strokeStyle = TIMBER;
  ctx.lineWidth = 2;
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.abs(Math.cos(a)) * R + 0.5, 55, 0, Math.PI, 2 * Math.PI);
    ctx.stroke();
  }
  ctx.strokeStyle = TIMBER_DARK;
  for (const k of [0.35, 0.7]) {
    ctx.beginPath();
    ctx.ellipse(x, y - 55 * Math.sin(Math.acos(1 - k)) * 0.95, R * (1 - k * 0.85), R * (1 - k * 0.85) * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  p.addVolumePoint(u, v, z + 55);
}

/** Onion helm, lantern openings and gilded double cross on a façade tower. */
export function towerHelm(p: IsoPainter, u: number, v: number, z: number): void {
  helm(p, u, v, z, BASILICA_HELM, VERDIGRIS);
  const [hx, hy] = p.p(u, v, z + 38);
  p.ctx.fillStyle = '#16120e';
  for (const dx of [-5, 1.5]) p.ctx.fillRect(hx + dx, hy - 5, 3.5, 9);
  finial(p, u, v, z + 82, 22);
}

/** A white stone saint on a pedestal at (u, v, z). */
export function statue(p: IsoPainter, u: number, v: number, z: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, z);
  const g = ctx.createLinearGradient(x - 3, 0, x + 3, 0);
  g.addColorStop(0, '#fbf6ea');
  g.addColorStop(1, '#b9b0a0');
  ctx.fillStyle = g;
  ctx.fillRect(x - 3, y - 4, 6, 4);
  ctx.beginPath();
  ctx.moveTo(x - 3, y - 4);
  ctx.lineTo(x - 2, y - 15);
  ctx.lineTo(x + 2, y - 15);
  ctx.lineTo(x + 3, y - 4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y - 17, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d8d0c0';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x + 2, y - 12);
  ctx.lineTo(x + 4.5, y - 17);
  ctx.stroke();
}

/**
 * Timber scaffold in front of the two visible faces of a block
 * (u0..u1 × v0..v1) from z0 to z1: standards, ledgers every storey,
 * cross braces and plank decks.
 */
export function scaffold(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, z0: number, z1: number): void {
  const ctx = p.ctx;
  const o = 0.1;
  const along: Array<[number, number]> = [];
  const nu = Math.max(2, Math.round((u1 - u0) / 0.42));
  const nv = Math.max(2, Math.round((v1 - v0) / 0.42));
  for (let i = 0; i <= nu; i++) along.push([u0 + ((u1 - u0) * i) / nu, v1 + o]);
  for (let i = nv - 1; i >= 0; i--) along.push([u1 + o, v0 + ((v1 - v0) * i) / nv]);
  const line = (a: readonly [number, number], b: readonly [number, number], color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  };
  for (let z = z0 + 22; z <= z1; z += 22) {
    for (let i = 0; i + 1 < along.length; i++) {
      const a = along[i]!;
      const b = along[i + 1]!;
      // Plank deck: a thin strip on the inside of the ledger.
      const d = [p.p(a[0], a[1], z), p.p(b[0], b[1], z)] as const;
      line(d[0], d[1], '#b48a54', 3.2);
      line(p.p(a[0], a[1], z - 22), p.p(b[0], b[1], z), TIMBER_DARK, 1);
    }
  }
  for (const [u, v] of along) line(p.p(u, v, z0), p.p(u, v, z1 + 8), TIMBER, 1.8);
  for (const [u, v] of along) p.addVolumePoint(u, v, z1);
}

/** Timber jib crane (treadwheel at the foot) at ground point (u, v), its hook over (tu, tv, tz). */
export function crane(p: IsoPainter, u: number, v: number, height: number, tu: number, tv: number, tz: number): void {
  const ctx = p.ctx;
  const [bx, by] = p.p(u, v, 0);
  const top = p.p(u, v, height);
  const tip = p.p(tu, tv, height + 14);
  const hook = p.p(tu, tv, tz);
  // Treadwheel.
  ctx.strokeStyle = TIMBER_DARK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(bx, by - 13, 6, 13, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = TIMBER;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(bx - Math.cos(a) * 6, by - 13 - Math.sin(a) * 13);
    ctx.lineTo(bx + Math.cos(a) * 6, by - 13 + Math.sin(a) * 13);
    ctx.stroke();
  }
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(top[0], top[1]);
  ctx.stroke();
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(top[0], top[1] + 12);
  ctx.lineTo(tip[0], tip[1]);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(40,30,20,.8)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(top[0], top[1] - 2);
  ctx.lineTo(tip[0], tip[1]);
  ctx.lineTo(hook[0], hook[1]);
  ctx.stroke();
  ctx.fillStyle = '#9a9184';
  ctx.fillRect(hook[0] - 5, hook[1], 10, 7);
  p.normalCylinder(bx - 2, top[1], 4, by - top[1]);
  p.addVolumePoint(u, v, height);
}

const HEDGE = 0x3f6b2c;

/** Clipped box-hedge parterre on u0..u1 × v0..v1 at height z: border, cross paths, cone topiaries at the corners. */
export function parterre(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, z: number): void {
  p.ground(u0, v0, u1, v1, 0xd9cdb0, z);
  const um = (u0 + u1) / 2;
  const vm = (v0 + v1) / 2;
  const w = 0.07;
  const beds: Array<[number, number, number, number]> = [
    [u0 + 0.05, v0 + 0.05, um - w, vm - w],
    [um + w, v0 + 0.05, u1 - 0.05, vm - w],
    [u0 + 0.05, vm + w, um - w, v1 - 0.05],
    [um + w, vm + w, u1 - 0.05, v1 - 0.05],
  ];
  for (const [a, b, c, d] of beds) {
    p.box(a, b, c, d, z, z + 5, { color: HEDGE }, shade(HEDGE, 1.15));
    p.ground(a + 0.06, b + 0.06, c - 0.06, d - 0.06, 0x6f9a44, z + 5);
  }
  for (const [u, v] of [[u0 + 0.08, v0 + 0.08], [u1 - 0.08, v0 + 0.08], [u0 + 0.08, v1 - 0.08], [u1 - 0.08, v1 - 0.08]] as const) {
    helm(p, u, v, z, [[0, 0.07], [4, 0.075], [16, 0.035], [22, 0.005]], 0x3a6a2a, false);
  }
}

/** Round stone fountain with a basin of water and a rising jet at (u, v, z). */
export function fountain(p: IsoPainter, u: number, v: number, z: number): void {
  const ctx = p.ctx;
  helm(p, u, v, z, [[0, 0.24], [6, 0.24], [7, 0.26], [8, 0.26]], 0xe6dcc6, false);
  const [x, y] = p.p(u, v, z + 7);
  const rx = 0.22 * Math.SQRT2 * HW;
  const g = ctx.createLinearGradient(x - rx, 0, x + rx, 0);
  g.addColorStop(0, '#9cc8d8');
  g.addColorStop(1, '#3e7a92');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, rx * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  helm(p, u, v, z + 6, [[0, 0.04], [14, 0.03], [15, 0.08], [17, 0.02]], 0xe6dcc6, false);
  ctx.strokeStyle = 'rgba(235,248,255,.85)';
  ctx.lineWidth = 1.2;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x, y - 18);
    ctx.quadraticCurveTo(x + s * 6, y - 30, x + s * 11, y - 4);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x, y - 18);
  ctx.lineTo(x, y - 30);
  ctx.stroke();
}

/** White stone balustrade along the two front edges of the podium (u1 and v1) at height z. */
export function balustrade(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, z: number): void {
  const ctx = p.ctx;
  const edges: Array<[number, number, number, number]> = [[u0, v1, u1, v1], [u1, v0, u1, v1]];
  for (const [a, b, c, d] of edges) {
    const n = Math.round(Math.hypot(c - a, d - b) / 0.06);
    for (let i = 0; i <= n; i++) {
      const [x, y] = p.p(a + ((c - a) * i) / n, b + ((d - b) * i) / n, z);
      const pier = i % 8 === 0;
      ctx.fillStyle = pier ? '#efe7d6' : '#ddd3bf';
      ctx.fillRect(x - (pier ? 2.5 : 1.2), y - (pier ? 12 : 8), pier ? 5 : 2.4, pier ? 12 : 8);
    }
    const s = p.p(a, b, z + 9);
    const e = p.p(c, d, z + 9);
    ctx.strokeStyle = '#f3ecdc';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(s[0], s[1]);
    ctx.lineTo(e[0], e[1]);
    ctx.stroke();
  }
}
