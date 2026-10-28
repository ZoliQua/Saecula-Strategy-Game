import type { IsoPainter, WallStyle } from '../isoPainter';
import { BRAZIER_LIGHT } from '../lighting/buildingLights';
import { N_UP } from '../lighting/viewSpace';
import { css, shade } from '../palette';

export type Headgear = 'galea' | 'kettle' | 'tricorn';

/**
 * Archer on a tower platform, feet at ground point (u, v, z), drawing a
 * bow to the right; tunic in the team colour. Painted between the back
 * and front parapets so the merlons hide the legs.
 */
export function archer(p: IsoPainter, u: number, v: number, z: number, team: number, hat: Headgear): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, z);
  ctx.fillStyle = '#3a2c22';
  ctx.fillRect(x - 3.2, y - 10, 2.6, 10);
  ctx.fillRect(x + 0.6, y - 10, 2.6, 10);
  // Tunic, shaded left-lit.
  const g = ctx.createLinearGradient(x - 5, 0, x + 5, 0);
  g.addColorStop(0, css(shade(team, 1.15)));
  g.addColorStop(1, css(shade(team, 0.62)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 9);
  ctx.lineTo(x - 4, y - 22);
  ctx.lineTo(x + 4, y - 22);
  ctx.lineTo(x + 5, y - 9);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4a3420';
  ctx.fillRect(x - 4.5, y - 13, 9, 1.8);
  // Arms reaching to the bow (left) and the drawn string (right shoulder).
  ctx.strokeStyle = '#c99a72';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 3, y - 20);
  ctx.lineTo(x - 9, y - 21);
  ctx.moveTo(x + 3, y - 20);
  ctx.lineTo(x + 2, y - 21.5);
  ctx.stroke();
  // Head.
  ctx.fillStyle = '#d6a77e';
  ctx.beginPath();
  ctx.arc(x, y - 25.5, 3.2, 0, Math.PI * 2);
  ctx.fill();
  headgear(ctx, x, y - 25.5, hat, team);
  // Bow and string.
  ctx.strokeStyle = '#5a3a1c';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 31);
  ctx.quadraticCurveTo(x - 13, y - 21, x - 8, y - 11);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(240,230,210,.8)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 31);
  ctx.lineTo(x + 2, y - 21.5);
  ctx.lineTo(x - 8, y - 11);
  ctx.stroke();
  p.normalCylinder(x - 5, y - 29, 10, 29);
}

function headgear(ctx: CanvasRenderingContext2D, x: number, y: number, hat: Headgear, team: number): void {
  if (hat === 'galea') {
    ctx.fillStyle = '#b8873a';
    ctx.beginPath();
    ctx.arc(x, y - 0.5, 3.6, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#b8352a';
    ctx.fillRect(x - 3.5, y - 6.5, 7, 2.4);
  } else if (hat === 'kettle') {
    ctx.fillStyle = '#8c8f94';
    ctx.beginPath();
    ctx.arc(x, y - 0.8, 3.4, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x - 5.5, y - 1.2, 11, 1.6);
  } else {
    ctx.fillStyle = '#1e1a18';
    ctx.beginPath();
    ctx.moveTo(x - 5.5, y - 1);
    ctx.lineTo(x, y - 5.5);
    ctx.lineTo(x + 5.5, y - 1);
    ctx.lineTo(x, y + 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = css(shade(team, 1.2));
    ctx.fillRect(x + 1.5, y - 4, 1.6, 1.6);
  }
}

/**
 * Iron fire basket on a stand at (u, v, z), flames and embers; records
 * the glow and a persistent flickering light whose ground point is
 * (lu, lv) — in front of the tower, so its faces catch the firelight.
 */
export function brazier(p: IsoPainter, u: number, v: number, z: number, lu: number, lv: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, z);
  ctx.strokeStyle = '#1d1814';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 4, y);
  ctx.lineTo(x, y - 9);
  ctx.lineTo(x + 4, y);
  ctx.moveTo(x, y + 1);
  ctx.lineTo(x, y - 9);
  ctx.stroke();
  // Basket.
  ctx.fillStyle = '#2b231d';
  ctx.beginPath();
  ctx.moveTo(x - 6.5, y - 14);
  ctx.lineTo(x + 6.5, y - 14);
  ctx.lineTo(x + 3.5, y - 8.5);
  ctx.lineTo(x - 3.5, y - 8.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffb648';
  ctx.fillRect(x - 5.5, y - 14.5, 11, 1.6);
  // Flames.
  for (const [dx, h, w] of [[-2.5, 11, 3.2], [2.3, 9, 3], [0, 15, 4]] as const) {
    const g = ctx.createRadialGradient(x + dx, y - 16, 0.5, x + dx, y - 16 - h * 0.3, h * 0.75);
    g.addColorStop(0, '#fff8d0');
    g.addColorStop(0.4, '#ffbe4a');
    g.addColorStop(1, 'rgba(235,90,25,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x + dx - w, y - 14);
    ctx.quadraticCurveTo(x + dx - w * 0.6, y - 14 - h * 0.6, x + dx, y - 14 - h);
    ctx.quadraticCurveTo(x + dx + w * 0.6, y - 14 - h * 0.6, x + dx + w, y - 14);
    ctx.closePath();
    ctx.fill();
  }
  p.addGlow(x, y - 20, 13);
  p.addLight(lu, lv, BRAZIER_LIGHT);
}

/**
 * Crenellated parapet around a square platform u0..u1 × v0..v1 at z:
 * `side` 'back' paints the two far edges (before the platform's
 * contents), 'front' the two near edges (after them).
 */
export function parapet(
  p: IsoPainter,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  z: number,
  wall: WallStyle,
  side: 'back' | 'front',
  merlons = 3,
): void {
  const t = 0.06;
  // merlons = 0: a plain balustrade (low wall) with corner pedestals.
  const h = merlons > 0 ? 7 : 11;
  const m = 9;
  const cap = shade(wall.color, 1.08);
  const step = merlons > 0 ? (u1 - u0) / (merlons * 2 - 1) : 0;
  const pedestal = (u: number, v: number) => p.box(u, v, u + 0.09, v + 0.09, z, z + h + 5, wall, cap);
  if (side === 'back') {
    p.box(u0, v0, u1, v0 + t, z, z + h, wall, cap);
    p.box(u0, v0, u0 + t, v1, z, z + h, wall, cap);
    if (merlons === 0) [[u0, v0], [u1 - 0.09, v0], [u0, v1 - 0.09]].forEach(([u, v]) => pedestal(u!, v!));
    for (let i = 0; i < merlons; i++) {
      const a = u0 + i * 2 * step;
      p.box(a, v0, a + step, v0 + t, z + h, z + h + m, wall, cap);
      const b = v0 + i * 2 * step;
      p.box(u0, b, u0 + t, b + step, z + h, z + h + m, wall, cap);
    }
    return;
  }
  p.box(u0, v1 - t, u1, v1, z, z + h, wall, cap);
  p.box(u1 - t, v0, u1, v1, z, z + h, wall, cap);
  if (merlons === 0) pedestal(u1 - 0.09, v1 - 0.09);
  for (let i = 0; i < merlons; i++) {
    const a = u0 + i * 2 * step;
    p.box(a, v1 - t, a + step, v1, z + h, z + h + m, wall, cap);
    const b = v0 + i * 2 * step;
    p.box(u1 - t, b, u1, b + step, z + h, z + h + m, wall, cap);
  }
}

type Pt = readonly [number, number];

/** Platform contents: fire basket and the archer. */
export function lookout(p: IsoPainter, u0: number, u1: number, z: number, team: number, hat: Headgear): void {
  brazier(p, u0 + 0.2, u1 - 0.18, z, 1.25, 1.35);
  archer(p, u1 - 0.26, u0 + 0.3, z, team, hat);
}

/** Straight stroke between two canvas points (braces, ladders, gun barrels). */
export function towerLine(p: IsoPainter, a: Pt, b: Pt, color: number, width: number): void {
  p.ctx.strokeStyle = css(color);
  p.ctx.lineWidth = width;
  p.ctx.beginPath();
  p.ctx.moveTo(a[0], a[1]);
  p.ctx.lineTo(b[0], b[1]);
  p.ctx.stroke();
}

/** Inner face of the far half of a round parapet (seen across the platform), with its coping. */
export function ringBack(p: IsoPainter, uc: number, vc: number, r: number, z: number, h: number, color: number): void {
  const n = 18;
  const at = (a: number, rr: number, zz: number) => p.p(uc + rr * Math.cos(a), vc + rr * Math.sin(a), zz);
  const outer: Pt[] = [];
  const inner: Pt[] = [];
  for (let k = 0; k <= n; k++) {
    const a = Math.PI * 0.75 + (k / n) * Math.PI;
    outer.push(at(a, r - 0.06, z + h));
    inner.push(at(a, r - 0.06, z));
  }
  const band = [...outer, ...inner.reverse()];
  p.fillPoly(band, css(shade(color, 0.62)));
  p.normals.fill(band, N_UP);
}

/** Round flat roof (gun platform floor) of radius r at height z. */
export function disc(p: IsoPainter, uc: number, vc: number, r: number, z: number, color: number): void {
  const pts: Pt[] = [];
  for (let k = 0; k < 24; k++) pts.push(p.p(uc + r * Math.cos((k / 24) * Math.PI * 2), vc + r * Math.sin((k / 24) * Math.PI * 2), z));
  p.fillPoly(pts, css(color));
  p.normals.fill(pts, N_UP);
}
