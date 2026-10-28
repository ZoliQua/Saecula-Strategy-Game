import type { IsoPainter } from '../../isoPainter';
import { lerp } from '../../isoProps';
import { baked } from '../../lighting/normalLayer';
import { css, shade } from '../../palette';
import type { UV } from '../prism';
import type { Arm } from '../wallKit';

type Pt = readonly [number, number];

/*
 * Roof along a wall arm (kit, used by several civs): a gable whose ridge
 * runs on the arm's line in any direction — the plank roof over the
 * Russian gorodnya's fighting gallery, the shingle cap on the Finnish
 * granite curtain.
 */

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

/**
 * Gable roof along an arm (over a fighting gallery, a wall cap): eaves `half`
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
