import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { ellipse } from '../../canvas';
import { octPrism, tentRoof, type OctDetail } from '../kits/tentRoof';
import type { RoofMaterial } from '../../roofCover';
import { post } from '../parts';
import type { ArchStyle } from '../style';

/*
 * Yard props of the Russian log town: field strips, a tent-roofed
 * (shatrovaya) windmill with lattice sails, a sawing trestle, a rocky
 * ore mound with a timbered adit, a clay bloomery and a tent-roofed
 * shaft headframe.
 */

/** Strip fields (rye and flax) in long bands across the plot. */
export function stripField(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, strips: number): void {
  const ctx = p.ctx;
  const crops = [0xc9a74c, 0x7d9a52, 0xb89a48, 0x8aa45a];
  for (let i = 0; i < strips; i++) {
    const a = v0 + ((v1 - v0) * i) / strips;
    const b = v0 + ((v1 - v0) * (i + 1)) / strips;
    const col = crops[i % crops.length] ?? 0xc9a74c;
    p.ground(u0, a + 0.015, u1, b - 0.015, shade(col, 0.82));
    for (let k = 0; k < 14; k++) {
      for (const t of [0.3, 0.7]) {
        const [x, y] = p.p(u0 + 0.05 + ((u1 - u0 - 0.1) * k) / 13, a + (b - a) * t, 0);
        ctx.strokeStyle = css(shade(col, 0.9 + p.random() * 0.3));
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (p.random() - 0.5) * 2, y - 8 - p.random() * 3);
        ctx.stroke();
      }
    }
  }
}

/** Four lattice sails on stocks round a hub (canvas point), arms `len` px, turned by `turn`. */
function sails(p: IsoPainter, x: number, y: number, len: number, turn: number): void {
  const ctx = p.ctx;
  for (let k = 0; k < 4; k++) {
    const a = turn + (k * Math.PI) / 2;
    const dx = Math.cos(a);
    const dy = Math.sin(a) * 0.9;
    const nx = -dy;
    const ny = dx;
    const w = 10;
    // Lattice frame on one side of the stock.
    const p0: readonly [number, number] = [x + dx * len * 0.22, y + dy * len * 0.22];
    const p1: readonly [number, number] = [x + dx * len, y + dy * len];
    ctx.fillStyle = '#e8dcc0';
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(p1[0], p1[1]);
    ctx.lineTo(p1[0] + nx * w, p1[1] + ny * w);
    ctx.lineTo(p0[0] + nx * w, p0[1] + ny * w);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#5a4430';
    ctx.lineWidth = 0.8;
    for (let t = 0.3; t <= 1.001; t += 0.14) {
      ctx.beginPath();
      ctx.moveTo(x + dx * len * t, y + dy * len * t);
      ctx.lineTo(x + dx * len * t + nx * w, y + dy * len * t + ny * w);
      ctx.stroke();
    }
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#4a3622';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(p1[0], p1[1]);
    ctx.stroke();
  }
  ctx.fillStyle = '#3a2a1a';
  ellipse(ctx, x, y, 3.5, 3.5);
  ctx.fill();
}

/** How a windmill's body and tent are dressed; default: a log body under a plank tent. */
export interface MillLook {
  readonly body: number;
  readonly detail: OctDetail;
  readonly roof: number;
  readonly material: RoofMaterial;
}

/** Tent-roofed octagonal windmill of apothem r on (uc, vc): body, tent, sails facing the viewer. */
export function tentMill(p: IsoPainter, s: ArchStyle, uc: number, vc: number, r: number, body: number, rise: number, team: number, look?: MillLook): void {
  const c = s.palette;
  const l = look ?? { body: c.darkWood, detail: 'logs', roof: c.roof, material: 'shingle' };
  p.box(uc - r - 0.04, vc - r - 0.04, uc + r + 0.04, vc + r + 0.04, 0, 8, { color: c.stone, detail: 'fieldstone' }, c.stone);
  octPrism(p, uc, vc, r, 8, body, l.body, l.detail, (w, _h, light) => {
    p.ctx.fillStyle = css(shade(c.doors.work, light));
    p.ctx.fillRect(w / 2 - 5, -20, 10, 20);
  });
  const apex = tentRoof(p, uc, vc, r, body, rise, l.roof, { material: l.material, eave: 0.07 });
  p.flag(uc, vc, apex, 18, team);
  const hub = p.p(uc + r * 0.9, vc + r * 0.9, body - 4);
  sails(p, hub[0], hub[1] + 2, 72, 0.42);
  const len = 72 / (Math.SQRT2 * 64);
  p.addVolumePoint(uc + r, vc + r, body + 66);
  p.addVolumePoint(uc + r + len, vc + r - len, body - 4);
}

/** Sawing trestle (kozly): two X frames carrying a log high for pit-sawing. */
export function trestle(p: IsoPainter, s: ArchStyle, u: number, v0: number, v1: number): void {
  const ctx = p.ctx;
  for (const v of [v0, v1]) {
    const [x, y] = p.p(u, v, 0);
    ctx.strokeStyle = css(s.palette.timber);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(x - 9, y);
    ctx.lineTo(x + 6, y - 34);
    ctx.moveTo(x + 9, y);
    ctx.lineTo(x - 6, y - 34);
    ctx.stroke();
  }
  const a = p.p(u, v0 - 0.12, 26);
  const b = p.p(u, v1 + 0.12, 26);
  ctx.lineCap = 'round';
  ctx.strokeStyle = css(shade(s.palette.darkWood, 0.9));
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#d8b88a';
  ellipse(ctx, b[0], b[1], 3, 4);
  ctx.fill();
  p.addVolumePoint(u, (v0 + v1) / 2, 30);
}

/** Rocky ore mound round (uc, vc): a heap of grey boulders, `h` px high. */
export function rockMound(p: IsoPainter, uc: number, vc: number, r: number, h: number): void {
  const ctx = p.ctx;
  for (let i = 0; i < 26; i++) {
    const t = i / 26;
    const a = p.random() * Math.PI * 2;
    const d = r * (1 - t) * (0.5 + p.random() * 0.5);
    const z = h * t * (0.85 + p.random() * 0.3);
    const [x, y] = p.p(uc + Math.cos(a) * d, vc + Math.sin(a) * d, z);
    const size = 9 + (1 - t) * 9 * p.random();
    const g = ctx.createLinearGradient(x - size, y - size, x + size, y + size);
    g.addColorStop(0, '#a9a49a');
    g.addColorStop(1, '#5f5a52');
    ctx.fillStyle = g;
    ellipse(ctx, x, y - size * 0.4, size, size * 0.7);
    ctx.fill();
  }
  p.normalCylinder(...(() => {
    const [x, y] = p.p(uc, vc, 0);
    const w = r * 90;
    return [x - w, y - h - 10, w * 2, h + 10] as const;
  })());
  for (const [du, dv] of [[1, 0], [0, 1], [-1, 0], [0, -1]] as const) p.addVolumePoint(uc + du * r, vc + dv * r, 4);
  p.addVolumePoint(uc, vc, h);
}

/** Clay bloomery furnace (domnitsa): a tapering clay cone with a dark mouth and a smoke vent. */
export function bloomery(p: IsoPainter, u: number, v: number, h: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  const g = ctx.createLinearGradient(x - 12, 0, x + 12, 0);
  g.addColorStop(0, '#b98a5c');
  g.addColorStop(1, '#6e4c30');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 13, y);
  ctx.quadraticCurveTo(x - 12, y - h * 0.6, x - 5, y - h);
  ctx.lineTo(x + 5, y - h);
  ctx.quadraticCurveTo(x + 12, y - h * 0.6, x + 13, y);
  ctx.quadraticCurveTo(x, y + 6, x - 13, y);
  ctx.fill();
  p.normalCylinder(x - 13, y - h, 26, h);
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.arc(x - 2, y - 4, 4.5, Math.PI, 0);
  ctx.lineTo(x + 2.5, y);
  ctx.lineTo(x - 6.5, y);
  ctx.fill();
  ellipse(ctx, x, y - h, 5, 2);
  ctx.fillStyle = '#1e140c';
  ctx.fill();
  p.addVolumePoint(u, v, h);
  p.addSmoke(u, v, h);
}

/** Shaft headframe: four braced posts over a dark shaft, a pulley, and an octagonal tent roof (shatyor) on top. */
export function tentHeadframe(p: IsoPainter, s: ArchStyle, u0: number, v0: number, u1: number, v1: number, h: number, rise: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.ground(u0 + 0.06, v0 + 0.06, u1 - 0.06, v1 - 0.06, 0x1c1610);
  for (const [u, v] of [[u0, v0], [u1, v0], [u0, v1]] as const) post(p, u, v, 0, h, 2.6, c.timber);
  // Cross braces on the two visible sides.
  ctx.strokeStyle = css(shade(c.timber, 0.9));
  ctx.lineWidth = 1.8;
  for (const [a, b] of [[p.p(u0, v1, 0), p.p(u1, v1, h * 0.6)], [p.p(u1, v1, 0), p.p(u1, v0, h * 0.6)], [p.p(u0, v1, h * 0.6), p.p(u1, v1, 0)]] as const) {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  const [px, py] = p.p((u0 + u1) / 2, (v0 + v1) / 2, h - 12);
  ctx.strokeStyle = '#2a2420';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px, py, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px, py + h - 22);
  ctx.stroke();
  post(p, u1, v1, 0, h, 2.6, c.timber);
  p.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, h, h + 6, { color: c.timber, detail: 'planks' }, c.timber);
  tentRoof(p, (u0 + u1) / 2, (v0 + v1) / 2, (u1 - u0) / 2 + 0.03, h + 6, rise, c.roofAlt, { material: 'tile', eave: 0.04, ribs: shade(c.roofAlt, 1.35) });
}

/** Tall stack of seasoning logs, end grain to the viewer, on two sleepers. */
export function logStack(p: IsoPainter, s: ArchStyle, u0: number, v0: number, u1: number, v1: number, h: number): void {
  const c = s.palette;
  p.box(u0, v0, u1, v1, 0, h, { color: c.darkWood, detail: 'logs' }, shade(c.darkWood, 0.9));
  p.leftFace(u0, u1, v1, 0, (w, fh) => {
    const ctx = p.ctx;
    for (let y = 4; y < fh - 1; y += 8) {
      for (let x = 4 + ((y / 8) % 2) * 3.5; x < w - 2; x += 7) {
        ctx.fillStyle = '#d8b88a';
        ellipse(ctx, x, -y, 3.1, 3.4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(90,60,30,.7)';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }
  }, h);
  // Binding poles at the ends.
  for (const u of [u0 + 0.03, u1 - 0.03]) post(p, u, v1 + 0.02, 0, h + 8, 1.6, c.timber);
}

/** Windlass headframe over an adit: two tall posts, a beam and a big solid winding wheel. */
export function windlass(p: IsoPainter, s: ArchStyle, u: number, v0: number, v1: number, h: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  for (const v of [v0, v1]) post(p, u, v, 0, h, 2.8, c.timber);
  const a = p.p(u, v0, h);
  const b = p.p(u, v1, h);
  ctx.strokeStyle = css(shade(c.timber, 0.9));
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  const [x, y] = p.p(u, (v0 + v1) / 2, h - 14);
  ctx.fillStyle = css(shade(c.timber, 0.75));
  ellipse(ctx, x, y, 11, 13);
  ctx.fill();
  ctx.fillStyle = css(shade(c.timber, 1.15));
  ellipse(ctx, x, y, 8, 10);
  ctx.fill();
  ctx.strokeStyle = css(shade(c.timber, 0.6));
  ctx.lineWidth = 1.4;
  for (let k = 0; k < 4; k++) {
    const t = (k / 4) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(t) * 8, y - Math.sin(t) * 10);
    ctx.lineTo(x + Math.cos(t) * 8, y + Math.sin(t) * 10);
    ctx.stroke();
  }
  p.normalCylinder(x - 11, y - 13, 22, 26);
  p.addVolumePoint(u, v0, h);
  p.addVolumePoint(u, v1, h);
}

/** Tapering wattle-and-daub smoke hood (dymnik) from (u0..u1, v0..v1) at z0 to a narrow vent at z1, smoking. */
export function smokeHood(p: IsoPainter, s: ArchStyle, u0: number, v0: number, u1: number, v1: number, z0: number, z1: number): void {
  const steps = 4;
  const uc = (u0 + u1) / 2;
  const vc = (v0 + v1) / 2;
  for (let i = 0; i < steps; i++) {
    const k = 1 - (i / steps) * 0.55;
    const hu = ((u1 - u0) / 2) * k;
    const hv = ((v1 - v0) / 2) * k;
    const za = z0 + ((z1 - z0) * i) / steps;
    const zb = z0 + ((z1 - z0) * (i + 1)) / steps;
    p.box(uc - hu, vc - hv, uc + hu, vc + hv, za, zb, { color: s.palette.plaster, detail: 'plaster' }, shade(s.palette.plaster, 0.8));
  }
  p.box(uc - 0.06, vc - 0.06, uc + 0.06, vc + 0.06, z1, z1 + 5, { color: 0x3a3530 }, 0x221e1a);
  p.addSmoke(uc, vc, z1 + 5);
}
