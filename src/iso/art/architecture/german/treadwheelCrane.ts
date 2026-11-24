import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { post } from '../parts';
import { beam, wheel } from '../landmarkProps';
import type { ArchStyle } from '../style';

/*
 * The Hanza-kontor's quay crane (M17): a medieval timber treadwheel crane
 * (Tretradkran, Lüneburg / Gdańsk) — an open braced frame on a stone
 * footing holding a great treadwheel, a shingled hip roof, and the jib
 * reaching out over the quay with a rope and a barrel on the hook.
 */

const SIZE = 0.62;
const FRAME_TOP = 66;
const ROOF_RISE = 24;
const WOOD = 0x6e4a2c;
const ROPE = 0xcdb47c;

/** Diagonal braces between two corner posts at (a) and (b), in world points. */
function braces(p: IsoPainter, a: readonly [number, number], b: readonly [number, number], color: number): void {
  beam(p, [a[0], a[1], 4], [b[0], b[1], FRAME_TOP - 6], color, 1.6);
  beam(p, [b[0], b[1], 4], [a[0], a[1], FRAME_TOP - 6], color, 1.6);
}

/** The crane with its footprint's back corner at (u, v), the jib reaching towards +v. */
export function treadwheelCrane(p: IsoPainter, s: ArchStyle, u: number, v: number, team: number): void {
  const c = s.palette;
  const wood = shade(WOOD, 1);
  const [u1, v1] = [u + SIZE, v + SIZE];
  const [uc, vc] = [u + SIZE / 2, v + SIZE / 2];
  p.box(u - 0.03, v - 0.03, u1 + 0.03, v1 + 0.03, 0, 6, { color: c.stone, detail: 'stone' }, shade(c.stone, 1.05));
  // Back posts and braces, the wheel in the middle, then the front posts.
  post(p, u, v, 6, FRAME_TOP, 2.6, wood);
  post(p, u1, v, 6, FRAME_TOP, 2.6, wood);
  post(p, u, v1, 6, FRAME_TOP, 2.6, wood);
  braces(p, [u, v], [u1, v], wood);
  braces(p, [u, v], [u, v1], wood);
  wheel(p, uc, vc - 0.06, 34, 0.29, 29, 'u', shade(WOOD, 1.2), 10, 3.6);
  wheel(p, uc, vc + 0.06, 34, 0.29, 29, 'u', shade(WOOD, 1.35), 10, 3.6);
  // The treads across the rim (the wheel is a drum of boards).
  const ctx = p.ctx;
  ctx.strokeStyle = css(shade(WOOD, 0.75), 0.8);
  ctx.lineWidth = 1;
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const q = p.p(uc + Math.cos(a) * 0.29, vc - 0.06, 34 + Math.sin(a) * 29);
    const r = p.p(uc + Math.cos(a) * 0.29, vc + 0.06, 34 + Math.sin(a) * 29);
    ctx.beginPath();
    ctx.moveTo(q[0], q[1]);
    ctx.lineTo(r[0], r[1]);
    ctx.stroke();
  }
  post(p, u1, v1, 6, FRAME_TOP, 2.6, wood);
  braces(p, [u1, v], [u1, v1], wood);
  // The open front: a tie beam only, so the wheel shows.
  beam(p, [u, v1, FRAME_TOP - 4], [u1, v1, FRAME_TOP - 4], wood, 2.4);
  // Plate and roof.
  p.box(u - 0.03, v - 0.03, u1 + 0.03, v1 + 0.03, FRAME_TOP, FRAME_TOP + 5, { color: shade(WOOD, 0.9) }, WOOD);
  p.material = 'shingle';
  p.hipRoof(u - 0.03, v - 0.03, u1 + 0.03, v1 + 0.03, FRAME_TOP + 5, ROOF_RISE, shade(c.roof, 0.85), 0.07);
  // The jib out over the quay, its pulley, the rope and a barrel on the hook.
  const jibEnd = [uc + 0.04, v1 + 0.5, FRAME_TOP + 22] as const;
  beam(p, [uc, vc, FRAME_TOP + 10], jibEnd, wood, 4);
  beam(p, [uc, v1, FRAME_TOP - 8], [uc + 0.02, v1 + 0.4, FRAME_TOP + 14], wood, 2.2);
  const [px, py] = p.p(...jibEnd);
  ctx.fillStyle = css(shade(WOOD, 0.6));
  ctx.beginPath();
  ctx.arc(px, py + 2, 3, 0, Math.PI * 2);
  ctx.fill();
  beam(p, [jibEnd[0], jibEnd[1], jibEnd[2] - 2], [jibEnd[0], jibEnd[1], 26], ROPE, 1);
  const [bx, by] = p.p(jibEnd[0], jibEnd[1], 26);
  const g = ctx.createLinearGradient(bx - 6, 0, bx + 6, 0);
  g.addColorStop(0, css(0x7a5530));
  g.addColorStop(0.45, css(0xa67a48));
  g.addColorStop(1, css(0x5e4024));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(bx - 5, by);
  ctx.quadraticCurveTo(bx - 7, by + 7, bx - 5, by + 14);
  ctx.lineTo(bx + 5, by + 14);
  ctx.quadraticCurveTo(bx + 7, by + 7, bx + 5, by);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3a332c';
  ctx.fillRect(bx - 6, by + 3, 12, 1.2);
  ctx.fillRect(bx - 6, by + 10, 12, 1.2);
  p.normalCylinder(bx - 6, by, 12, 14);
  p.flag(uc, vc, FRAME_TOP + 5 + ROOF_RISE - 2, 14, team);
}
