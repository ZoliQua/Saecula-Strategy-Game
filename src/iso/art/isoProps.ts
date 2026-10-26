import type { Ctx } from './canvas';
import { css, shade } from './palette';

type Pt = readonly [number, number];

/*
 * Small painted details used by IsoPainter (windows, doors, flags,
 * roof tiles). Pure canvas drawing; lighting data is recorded by the
 * painter methods that call these.
 */

/** Window with frame and warm glow, in face-local coords. */
export function paintWindow(ctx: Ctx, x: number, y: number, w: number, h: number, arched: boolean): void {
  ctx.fillStyle = '#2b1d12';
  roundedOrArch(ctx, x - 1.5, y - 1.5, w + 3, h + 3, arched);
  ctx.fill();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#ffd27a');
  g.addColorStop(1, '#c9762e');
  ctx.fillStyle = g;
  roundedOrArch(ctx, x, y, w, h, arched);
  ctx.fill();
  ctx.fillStyle = 'rgba(43,29,18,.9)';
  ctx.fillRect(x + w / 2 - 0.6, y, 1.2, h);
  ctx.fillRect(x, y + h * 0.55, w, 1.2);
}

export function paintDoor(ctx: Ctx, x: number, w: number, h: number, color: number): void {
  ctx.fillStyle = '#24170d';
  roundedOrArch(ctx, x - 2, -h - 2, w + 4, h + 2, true);
  ctx.fill();
  ctx.fillStyle = css(color);
  roundedOrArch(ctx, x, -h, w, h, true);
  ctx.fill();
  ctx.fillStyle = css(shade(color, 0.6));
  for (let i = 1; i < 3; i++) ctx.fillRect(x + (w * i) / 3, -h + 3, 0.8, h - 3);
}

export function paintRidge(ctx: Ctx, a: Pt, b: Pt, color: number): void {
  ctx.strokeStyle = css(shade(color, 0.55));
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.strokeStyle = css(shade(color, 1.3), 0.8);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1] - 1);
  ctx.lineTo(b[0], b[1] - 1);
  ctx.stroke();
}

/** Pennant on a pole, base at canvas point (x, y). */
export function paintFlag(ctx: Ctx, x: number, y: number, pole: number, team: number, big: boolean): void {
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - pole);
  ctx.stroke();
  ctx.fillStyle = '#e8c35a';
  ctx.beginPath();
  ctx.arc(x, y - pole - 1.5, 2.2, 0, Math.PI * 2);
  ctx.fill();
  const fw = big ? 26 : 18;
  const fh = big ? 15 : 11;
  const g = ctx.createLinearGradient(x, 0, x + fw, 0);
  g.addColorStop(0, css(shade(team, 1.15)));
  g.addColorStop(1, css(shade(team, 0.75)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x + 1, y - pole + 1);
  ctx.quadraticCurveTo(x + fw * 0.5, y - pole - 3, x + fw, y - pole + fh * 0.35);
  ctx.lineTo(x + fw * 0.82, y - pole + fh * 0.6);
  ctx.quadraticCurveTo(x + fw * 0.5, y - pole + fh + 2, x + 1, y - pole + fh);
  ctx.closePath();
  ctx.fill();
}

export function lerp(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function roundedOrArch(ctx: Ctx, x: number, y: number, w: number, h: number, arched: boolean): void {
  ctx.beginPath();
  if (arched) {
    const r = w / 2;
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, 0);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  } else {
    ctx.rect(x, y, w, h);
  }
}
