import { ellipse } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import type { ArchStyle } from '../style';

type Pt = readonly [number, number];

/*
 * Georgian yard props: raked gravel, wrought-iron railings, a sentry
 * box, stacked muskets, field guns and split stable doors. Each records
 * its lighting data (normals clipped to the prop, volume points).
 */

/** Raked gravel plate with loose pebbles. */
export function gravel(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, color: number): void {
  p.ground(u0, v0, u1, v1, color);
  const ctx = p.ctx;
  const n = Math.round((u1 - u0) * (v1 - v0) * 60);
  for (let i = 0; i < n; i++) {
    const [x, y] = p.p(u0 + p.random() * (u1 - u0), v0 + p.random() * (v1 - v0), 0);
    ctx.fillStyle = css(shade(color, 0.75 + p.random() * 0.45), 0.7);
    ctx.fillRect(x, y, 1.6, 1.1);
  }
}

/** Black wrought-iron railings with spear finials and a top rail, from (u0, v0) to (u1, v1). */
export function railings(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, h: number): void {
  const ctx = p.ctx;
  const n = Math.max(3, Math.round(Math.hypot(u1 - u0, v1 - v0) / 0.055));
  ctx.fillStyle = '#1b1a1a';
  for (let i = 0; i <= n; i++) {
    const [x, y] = p.p(u0 + ((u1 - u0) * i) / n, v0 + ((v1 - v0) * i) / n, 0);
    ctx.fillRect(x - 0.5, y - h, 1, h);
    ctx.beginPath();
    ctx.moveTo(x - 1.3, y - h);
    ctx.lineTo(x, y - h - 3);
    ctx.lineTo(x + 1.3, y - h);
    ctx.fill();
  }
  ctx.strokeStyle = '#1b1a1a';
  for (const z of [2, h - 2]) {
    const a = p.p(u0, v0, z);
    const b = p.p(u1, v1, z);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  p.addVolumePoint(u0, v0, h);
  p.addVolumePoint(u1, v1, h);
}

/** Painted timber sentry box with a pitched lead roof and the team colour on its band. */
export function sentryBox(p: IsoPainter, s: ArchStyle, u: number, v: number, team: number): void {
  const d = 0.22;
  p.box(u, v, u + d, v + d, 0, 30, { color: 0xe4ddca });
  p.leftFace(u, u + d, v + d, 0, (w) => {
    p.ctx.fillStyle = '#1e1a16';
    p.ctx.fillRect(w * 0.2, -26, w * 0.6, 24);
    p.ctx.fillStyle = css(team);
    p.ctx.fillRect(0, -30, w, 3);
  }, 30);
  p.rightFace(v, v + d, u + d, 0, (w) => {
    p.ctx.fillStyle = css(shade(team, 0.72));
    p.ctx.fillRect(0, -30, w, 3);
  }, 30);
  p.material = 'slate';
  p.gableRoof(u, v, u + d, v + d, 30, 10, s.palette.roof, 0xe4ddca, 'v', 0.03);
}

/** Muskets stacked in a pyramid (three barrels leaning together) with a fixed-bayonet glint. */
export function stackedArms(p: IsoPainter, u: number, v: number): void {
  const ctx = p.ctx;
  const apex = p.p(u, v, 24);
  const feet: Pt[] = [p.p(u - 0.08, v - 0.05, 0), p.p(u + 0.09, v - 0.03, 0), p.p(u, v + 0.09, 0)];
  ctx.lineCap = 'round';
  for (const [x, y] of feet) {
    ctx.strokeStyle = '#5a3a20';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (apex[0] - x) * 0.55, y + (apex[1] - y) * 0.55);
    ctx.stroke();
    ctx.strokeStyle = '#4a4e54';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + (apex[0] - x) * 0.55, y + (apex[1] - y) * 0.55);
    ctx.lineTo(apex[0], apex[1] - 4);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#d8dce0';
  ctx.fillRect(apex[0] - 0.5, apex[1] - 9, 1, 6);
  p.normals.cylinderStroke(feet.map((f) => [f, apex]), 2.4, apex[0] - 6, 12);
  p.addVolumePoint(u, v, 24);
}

/** Field gun: a bronze barrel on a dark carriage with two spoked wheels, trail on the ground. */
export function cannon(p: IsoPainter, u: number, v: number): void {
  const ctx = p.ctx;
  const trail = p.p(u - 0.28, v, 1);
  const axle = p.p(u, v, 9);
  const muzzle = p.p(u + 0.24, v, 13);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3a3026';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(trail[0], trail[1]);
  ctx.lineTo(axle[0], axle[1]);
  ctx.stroke();
  for (const [w, col, dy] of [[5.5, '#5a4320', 0], [3.5, '#a07a38', -0.8], [1.2, '#e2c27a', -1.6]] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(axle[0] - 4, axle[1] - 2 + dy);
    ctx.lineTo(muzzle[0], muzzle[1] + dy);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  const [wx, wy] = p.p(u, v + 0.09, 8);
  ctx.strokeStyle = '#2b241e';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(wx, wy, 5.5, 8, 0.45, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 0.9;
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(wx - Math.cos(a) * 5, wy - Math.sin(a) * 7.5);
    ctx.lineTo(wx + Math.cos(a) * 5, wy + Math.sin(a) * 7.5);
    ctx.stroke();
  }
  ellipse(ctx, muzzle[0] + 1, muzzle[1], 1.6, 2);
  ctx.fillStyle = '#140e08';
  ctx.fill();
  p.normals.cylinderStroke([[trail, axle], [axle, muzzle]], 5, wx - 8, 16);
  p.addVolumePoint(u, v, 14);
}

/**
 * Split stable door (face-local, x..x+w, h tall): the top leaf open on
 * a dark stall with a horse looking out, the bottom leaf shut in `color`,
 * a team-coloured saddle blanket hung over it.
 */
export function stableDoor(p: IsoPainter, s: ArchStyle, x: number, w: number, h: number, color: number, light: number, team: number): void {
  const ctx = p.ctx;
  ctx.fillStyle = css(shade(s.palette.ashlar, light));
  ctx.fillRect(x - 2, -h - 3, w + 4, h + 3);
  ctx.fillStyle = '#17110c';
  ctx.fillRect(x, -h, w, h);
  // Horse head over the half door.
  ctx.fillStyle = css(shade(0x6b4226, light));
  ctx.beginPath();
  ctx.moveTo(x + w * 0.3, -h * 0.45);
  ctx.lineTo(x + w * 0.35, -h * 0.9);
  ctx.lineTo(x + w * 0.62, -h * 0.85);
  ctx.lineTo(x + w * 0.78, -h * 0.55);
  ctx.lineTo(x + w * 0.6, -h * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = css(shade(0xf0e8d8, light));
  ctx.fillRect(x + w * 0.5, -h * 0.85, 1.2, h * 0.25);
  ctx.fillStyle = css(shade(color, light));
  ctx.fillRect(x, -h * 0.48, w, h * 0.48);
  ctx.strokeStyle = css(shade(color, light * 0.6));
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(x, -h * 0.48);
  ctx.lineTo(x + w, 0);
  ctx.stroke();
  ctx.fillStyle = css(shade(team, light));
  ctx.fillRect(x + w * 0.15, -h * 0.5, w * 0.4, h * 0.22);
}
