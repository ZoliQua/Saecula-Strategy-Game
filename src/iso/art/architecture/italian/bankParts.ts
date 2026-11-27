import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import type { ArchStyle } from '../style';

/*
 * Parts of the Italian Bankház: the family arms in a stone cartouche
 * (a field in the owner's colour strewn with gilt roundels, after the
 * Medici palle), the rusticated round-arched portal, and the banker's
 * table (banco) under the loggia with its green cloth, coin stacks,
 * ledger and scales.
 */

const GILT = 0xe0b440;

/** The family arms (face-local): an oval cartouche, a team-coloured field and six gilt roundels, a little crown above. */
export function familyArms(ctx: Ctx, s: ArchStyle, x: number, y: number, r: number, team: number, light: number): void {
  const stone = shade(s.palette.ashlar, 1.08);
  // Cartouche scrolls.
  ctx.fillStyle = css(shade(stone, light));
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.08, r * 1.32, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const dx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + dx * r * 1.05, y + r * 0.2, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = css(shade(stone, light * 0.7));
  ctx.beginPath();
  ctx.ellipse(x, y + 0.6, r * 0.9, r * 1.12, 0, 0, Math.PI * 2);
  ctx.fill();
  // The field.
  const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, css(shade(team, light * 1.15)));
  g.addColorStop(1, css(shade(team, light * 0.75)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.82, r * 1.04, 0, 0, Math.PI * 2);
  ctx.fill();
  // Six roundels: 3, 2, 1.
  const ball = r * 0.2;
  const rows: Array<readonly [number, number]> = [[-0.42, -0.5], [0, -0.55], [0.42, -0.5], [-0.24, 0.0], [0.24, 0.0], [0, 0.5]];
  for (const [bx, by] of rows) {
    ctx.fillStyle = css(shade(GILT, light * 0.7));
    ctx.beginPath();
    ctx.arc(x + bx * r, y + by * r + 0.4, ball, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(shade(GILT, light * 1.1));
    ctx.beginPath();
    ctx.arc(x + bx * r - 0.3, y + by * r, ball * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // Crown.
  ctx.fillStyle = css(shade(GILT, light));
  const cy = y - r * 1.32;
  ctx.fillRect(x - r * 0.55, cy - 1.5, r * 1.1, 2.2);
  for (const dx of [-0.5, 0, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * r - 1.4, cy - 1.4);
    ctx.lineTo(x + dx * r, cy - 4.4);
    ctx.lineTo(x + dx * r + 1.4, cy - 1.4);
    ctx.fill();
  }
}

/** Rusticated round-arched portal (face-local): radiating voussoirs, oak leaves with bosses. */
export function rusticPortal(ctx: Ctx, s: ArchStyle, x: number, w: number, h: number, light: number): void {
  const c = s.palette;
  const r = w / 2;
  const cx = x + r;
  const cy = -h + r;
  for (let i = 0; i < 9; i++) {
    const a0 = Math.PI + (i / 9) * Math.PI;
    const a1 = Math.PI + ((i + 1) / 9) * Math.PI;
    ctx.fillStyle = css(shade(c.stone, light * (i % 2 ? 1.05 : 1.15)));
    ctx.beginPath();
    ctx.arc(cx, cy, r + 9, a0 + 0.02, a1 - 0.02);
    ctx.arc(cx, cy, r, a1 - 0.02, a0 + 0.02, true);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = css(shade(c.stone, light * 1.1));
  ctx.fillRect(x - 6, cy, 6, h - r);
  ctx.fillRect(x + w, cy, 6, h - r);
  ctx.fillStyle = css(shade(c.doors.main, light));
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, cy);
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.lineTo(x + w, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = css(shade(c.doors.main, light * 0.6));
  ctx.fillRect(cx - 0.6, -h, 1.2, h);
  ctx.fillStyle = css(shade(0xb89a5a, light));
  for (let yy = -h + r + 4; yy < -3; yy += 6) {
    for (const xx of [x + 3, cx - 4, cx + 3, x + w - 4]) ctx.fillRect(xx, yy, 1.4, 1.4);
  }
}

/**
 * The banker's table at ground point (u, v): a trestle table with a green
 * cloth, coin stacks, an open ledger and a pair of scales, a strongbox
 * beside it.
 */
export function banco(p: IsoPainter, u: number, v: number): void {
  const ctx = p.ctx;
  const z = 11;
  const a = 0.26;
  const b = 0.12;
  p.box(u - a, v - b, u + a, v + b, z - 2, z, { color: 0x2f5a3a }, 0x2f6a3e);
  for (const [du, dv] of [[-a + 0.03, -b + 0.03], [a - 0.03, -b + 0.03], [-a + 0.03, b - 0.03], [a - 0.03, b - 0.03]] as const) {
    const [x, y] = p.p(u + du, v + dv, 0);
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(x - 0.8, y - z + 2, 1.6, z - 2);
  }
  // Cloth hanging over the front edge.
  const f = [p.p(u - a, v + b, z), p.p(u + a, v + b, z), p.p(u + a, v + b, z - 5), p.p(u - a, v + b, z - 5)];
  p.fillPoly(f, '#26502f');
  // Coin stacks.
  for (const [du, dv, n] of [[-0.12, -0.02, 4], [-0.06, 0.03, 3], [0.0, -0.04, 5]] as const) {
    const [x, y] = p.p(u + du, v + dv, z);
    for (let k = 0; k < n; k++) {
      ctx.fillStyle = k % 2 ? '#c99a2e' : '#f0c858';
      ctx.beginPath();
      ctx.ellipse(x, y - k * 1.3, 2.4, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Open ledger.
  const [lx, ly] = p.p(u + 0.1, v + 0.01, z);
  ctx.fillStyle = '#efe6cc';
  ctx.beginPath();
  ctx.moveTo(lx - 5, ly - 0.5);
  ctx.lineTo(lx, ly - 2.5);
  ctx.lineTo(lx + 5, ly - 0.5);
  ctx.lineTo(lx, ly + 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#6a5a40';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(lx, ly - 2.5);
  ctx.lineTo(lx, ly + 1.5);
  ctx.stroke();
  // Scales.
  const [sx, sy] = p.p(u + 0.16, v - 0.06, z);
  ctx.strokeStyle = '#7a6a48';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, sy - 8);
  ctx.moveTo(sx - 4, sy - 7);
  ctx.lineTo(sx + 4, sy - 7);
  ctx.stroke();
  ctx.fillStyle = '#b8954a';
  for (const dx of [-4, 4]) {
    ctx.beginPath();
    ctx.ellipse(sx + dx, sy - 3.5, 2, 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  p.addVolumePoint(u, v, z + 8);
  // Iron-bound strongbox.
  p.box(u - 0.08 - a, v - 0.05, u - a + 0.02, v + 0.05, 0, 7, { color: 0x5a3a22, detail: 'planks' }, 0x4a2e1a);
}
