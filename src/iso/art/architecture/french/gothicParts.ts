import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { N_LEFT, N_RIGHT, N_UP } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import type { ArchStyle } from '../style';

type Pt = readonly [number, number];

/*
 * Loire Gothic details (French age 2): machicolation bands, pointed
 * doorways, tall stone dormers (lucarnes) with crocketed gables, moat
 * water and tall chimney stacks. Face-local helpers paint inside
 * leftFace / rightFace; the rest record their own normals and volume.
 */

/** Machicolation band at the top of a face (face-local): corbels under an oversailing parapet with arrow loops. */
export function machicolations(ctx: Ctx, w: number, h: number, stone: number, light: number): void {
  const top = -h;
  ctx.fillStyle = css(shade(stone, light * 1.06));
  ctx.fillRect(0, top, w, 12);
  ctx.fillStyle = css(shade(stone, light * 0.8));
  ctx.fillRect(0, top + 12, w, 2.2);
  for (let x = 3; x < w - 3; x += 7) {
    ctx.fillStyle = css(shade(stone, light * 0.92));
    ctx.fillRect(x, top + 14, 3.6, 6);
    ctx.fillStyle = 'rgba(22,16,12,.75)';
    ctx.fillRect(x + 3.6, top + 14, 3.4, 4.5);
  }
  ctx.fillStyle = 'rgba(22,16,12,.8)';
  for (let x = 10; x < w - 8; x += 21) ctx.fillRect(x, top + 3, 1.6, 7);
  ctx.fillStyle = css(shade(stone, light * 1.2), 0.6);
  ctx.fillRect(0, top, w, 1.2);
}

/** Pointed doorway with a moulded surround (face-local, base at y = 0). */
export function pointedDoor(ctx: Ctx, x: number, w: number, h: number, surround: number, leaf: number, light = 1): void {
  const arch = (dx: number, dw: number, dh: number) => {
    ctx.beginPath();
    ctx.moveTo(x + dx, 0);
    ctx.lineTo(x + dx, -dh + dw * 0.7);
    ctx.quadraticCurveTo(x + dx, -dh + dw * 0.15, x + dx + dw / 2, -dh);
    ctx.quadraticCurveTo(x + dx + dw, -dh + dw * 0.15, x + dx + dw, -dh + dw * 0.7);
    ctx.lineTo(x + dx + dw, 0);
    ctx.closePath();
  };
  ctx.fillStyle = css(shade(surround, light * 1.08));
  arch(-3.5, w + 7, h + 4);
  ctx.fill();
  ctx.fillStyle = css(shade(surround, light * 0.7));
  arch(-1.2, w + 2.4, h + 1.4);
  ctx.fill();
  ctx.fillStyle = css(shade(leaf, light));
  arch(0, w, h);
  ctx.fill();
  ctx.fillStyle = css(shade(leaf, light * 0.6));
  ctx.fillRect(x + w / 2 - 0.5, -h + w * 0.3, 1, h - w * 0.3);
  for (let y = -h * 0.3; y > -h + w * 0.5; y -= h * 0.25) ctx.fillRect(x + 1, y, w - 2, 0.9);
}

/**
 * Lucarne (tall stone dormer) on a slope, face-local: a pointed window in
 * a moulded frame under a steep crocketed gable flanked by pinnacles.
 */
function lucarne(p: IsoPainter, s: ArchStyle, w: number, h: number, light: number): void {
  const ctx = p.ctx;
  const stone = s.palette.ashlar;
  const body = h * 0.58;
  ctx.fillStyle = css(shade(stone, light));
  ctx.beginPath();
  ctx.moveTo(1, 0);
  ctx.lineTo(1, -body);
  ctx.lineTo(w / 2, -h);
  ctx.lineTo(w - 1, -body);
  ctx.lineTo(w - 1, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = css(shade(stone, light * 0.62), 0.8);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Crockets along the rakes and pinnacles at the shoulders.
  ctx.fillStyle = css(shade(stone, light * 1.15));
  for (let t = 0.2; t < 0.95; t += 0.25) {
    for (const [x0, x1] of [[1, w / 2], [w - 1, w / 2]] as const) ctx.fillRect(x0 + (x1 - x0) * t - 1, -body - (h - body) * t - 2, 2, 2);
  }
  for (const x of [0, w - 2.6]) {
    ctx.fillRect(x, -body - 9, 2.6, 11);
    ctx.beginPath();
    ctx.moveTo(x - 0.4, -body - 9);
    ctx.lineTo(x + 1.3, -body - 15);
    ctx.lineTo(x + 3, -body - 9);
    ctx.fill();
  }
  p.window(w * 0.25, -body + 2, w * 0.5, body - 5, true);
}

/** Lucarnes on the +v (`side` 'v') or +u slope of a hipped roof, at fraction `f` up the slope (rise / run given). */
export function lucarnes(p: IsoPainter, s: ArchStyle, side: 'u' | 'v', at: readonly number[], edge: number, run: number, eave: number, rise: number, f = 0.18): void {
  const w = 14;
  const h = 34;
  const hw = w / 128;
  const z = eave + rise * f;
  for (const c of at) {
    if (side === 'v') {
      const v = edge - run * f;
      p.normals.fill([p.p(c - hw, v, z), p.p(c + hw, v, z), p.p(c + hw, v, z + h), p.p(c - hw, v, z + h)], N_LEFT);
      p.leftFace(c - hw, c + hw, v, z, (fw, fh) => lucarne(p, s, fw, fh, 1), h);
      p.addVolumePoint(c, v, z + h);
    } else {
      const u = edge - run * f;
      p.normals.fill([p.p(u, c + hw, z), p.p(u, c - hw, z), p.p(u, c - hw, z + h), p.p(u, c + hw, z + h)], N_RIGHT);
      p.rightFace(c - hw, c + hw, u, z, (fw, fh) => lucarne(p, s, fw, fh, 0.76), h);
      p.addVolumePoint(u, c, z + h);
    }
  }
}

/** Still moat water on u0..u1 × v0..v1 with a pale rim of reflected sky. */
export function moat(p: IsoPainter, u0: number, v0: number, u1: number, v1: number): void {
  const pts = p.ground(u0, v0, u1, v1, 0x3d6276);
  const ys = pts.map((q) => q[1]);
  const g = p.ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
  g.addColorStop(0, 'rgba(160,196,214,.55)');
  g.addColorStop(0.5, 'rgba(70,110,130,.15)');
  g.addColorStop(1, 'rgba(20,40,52,.35)');
  p.fillPoly(pts, g);
  const ctx = p.ctx;
  ctx.strokeStyle = 'rgba(220,236,244,.35)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 14; k++) {
    const [x, y] = p.p(u0 + p.random() * (u1 - u0), v0 + p.random() * (v1 - v0), 0);
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x + 6, y);
    ctx.stroke();
  }
}

/** Tall dressed-stone chimney stack standing on a roof from z0 to z1, with a moulded cap and a smoke anchor. */
export function tallStack(p: IsoPainter, u: number, v: number, z0: number, z1: number, stone: number): void {
  const d = 0.07;
  p.box(u - d, v - d, u + d, v + d, z0, z1, { color: stone, detail: 'stone' });
  p.box(u - d - 0.02, v - d - 0.02, u + d + 0.02, v + d + 0.02, z1, z1 + 4, { color: shade(stone, 1.05) }, stone);
  const top: Pt[] = [p.p(u - d, v - d, z1 + 4), p.p(u + d, v - d, z1 + 4), p.p(u + d, v + d, z1 + 4), p.p(u - d, v + d, z1 + 4)];
  p.fillPoly(top, '#2a2420');
  p.normals.fill(top, N_UP);
  p.addSmoke(u, v, z1 + 4);
}
