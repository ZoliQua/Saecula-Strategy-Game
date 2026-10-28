import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { lerp } from '../../isoProps';
import { baked } from '../../lighting/normalLayer';
import { css, shade } from '../../palette';
import type { UV } from '../prism';
import type { Arm } from '../wallKit';

type Pt = readonly [number, number];

/*
 * Details of the Russian wall styles: the split clamp posts that hold
 * the horizontal logs of the age-1 wall, the stacked log ends where two
 * cribs of a gorodnya meet, the plank roof over a wall's fighting
 * gallery (a gable along the run, any direction), and loopholes.
 */

/** Sawn end grain of a log. */
const END_GRAIN = 0xd8b88a;

/** Unit ground direction of an arm (towards its far end). */
export function armDir(arm: Arm): UV {
  const len = Math.hypot(arm.b[0] - arm.a[0], arm.b[1] - arm.a[1]) || 1;
  return [(arm.b[0] - arm.a[0]) / len, (arm.b[1] - arm.a[1]) / len];
}

/** Whether the arm shows a long face to the viewer (NW–SE diagonals are seen end-on). */
export function facesViewer(arm: Arm): boolean {
  const [du, dv] = armDir(arm);
  return Math.abs(dv - du) > 1e-6;
}

/** Upright split post at ground point c from z0 to z1: a half-round, lit on its left, a blunt cut head. */
export function clampPost(p: IsoPainter, c: UV, z0: number, z1: number, color: number): void {
  const ctx = p.ctx;
  const [x, y0] = p.p(c[0], c[1], z0);
  const y1 = y0 - (z1 - z0);
  const r = 2.4;
  ctx.fillStyle = css(shade(color, 1.08));
  ctx.fillRect(x - r, y1, r, y0 - y1);
  ctx.fillStyle = css(shade(color, 0.66));
  ctx.fillRect(x, y1, r, y0 - y1);
  ctx.fillStyle = css(shade(END_GRAIN, 0.9));
  ctx.beginPath();
  ctx.ellipse(x, y1, r, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  p.normalCylinder(x - r, y1 - 1, r * 2, y0 - y1 + 1);
}

/** A column of sawn log ends at ground point c, one per log course from z0 to z1 (a crib's corner seen in the wall face). */
export function logEndColumn(p: IsoPainter, c: UV, z0: number, z1: number, color: number): void {
  const ctx = p.ctx;
  for (let z = z0 + 4; z < z1 - 2; z += 8) {
    const [x, y] = p.p(c[0], c[1], z);
    ctx.fillStyle = css(shade(color, 0.5), 0.8);
    ctx.beginPath();
    ctx.ellipse(x + 0.6, y + 0.4, 3.4, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(shade(END_GRAIN, 0.78));
    ctx.beginPath();
    ctx.ellipse(x, y, 2.9, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(shade(END_GRAIN, 0.72), 0.7);
    ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
  }
}

/** Dark loopholes along a face-local strip: `w` wide, sills at y, `h` tall, every `step` px. */
export function loopholes(ctx: Ctx, w: number, y: number, h: number, step: number, light: number): void {
  ctx.fillStyle = css(shade(0x1a120c, light));
  for (let x = step / 2; x < w - 3; x += step) ctx.fillRect(x - 1.4, y - h, 2.8, h);
}

/**
 * Plank gable roof along an arm over its fighting gallery: eaves `half`
 * tiles to each side of the line at `eave`, the ridge on the line at
 * `ridge`. The far slope first, then the near one (with its plank
 * cover); slopes of an arm seen end-on are both side-on.
 */
export function galleryRoof(p: IsoPainter, arm: Arm, half: number, eave: number, ridge: number, color: number): void {
  const [du, dv] = armDir(arm);
  const n: UV = [-dv, du];
  const at = (q: UV, s: number, z: number): Pt => p.p(q[0] + n[0] * s * half, q[1] + n[1] * s * half, z);
  const ra = at(arm.a, 0, ridge);
  const rb = at(arm.b, 0, ridge);
  const sides = [1, -1].sort((x, y) => (n[0] + n[1]) * x - (n[0] + n[1]) * y);
  const prev = p.material;
  p.material = 'shingle';
  for (const s of sides) {
    const ea = at(arm.a, s, eave);
    const eb = at(arm.b, s, eave);
    const ou = n[0] * s;
    const ov = n[1] * s;
    const light = baked(0.86 + 0.2 * ov - 0.12 * ou);
    const normal = p.slope(ou, ov, half, ridge - eave);
    const pts: Pt[] = [ea, eb, rb, ra];
    if (ou + ov < -1e-6) {
      p.fillPoly(pts, css(shade(color, light * 0.92)));
      p.normals.fill(pts, normal);
    } else p.roofSlope(pts, color, light, normal, (t) => [lerp(ra, ea, t), lerp(rb, eb, t)]);
    for (const q of [arm.a, arm.b]) p.addVolumePoint(q[0] + n[0] * s * half, q[1] + n[1] * s * half, eave);
  }
  p.material = prev;
  for (const q of [arm.a, arm.b]) p.addVolumePoint(q[0], q[1], ridge);
}
