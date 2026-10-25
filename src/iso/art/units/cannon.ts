import { axesAlong, type Figure } from './figure';
import type { UnitAnim } from './layout';
import { M, type Material } from './materials';
import { add, applyPoint, madd, norm, rotate, rotationAbout, sub, translation, compose, type V3, type Xform } from './rigMath';

const WHEEL_R = 8.4;
const AXLE: V3 = [-0.5, 0, WHEEL_R];
const SPOKES = 8;
const SMOKE: Material = { color: 0xe4e0d8 };

/** Field gun on a wheeled carriage (forward = muzzle). */
export function drawCannon(fig: Figure, anim: UnitAnim, i: number): void {
  const recoil = anim === 'attack' ? ([0, -0.4, -5.2, -3.6, -1.2][i] ?? 0) : 0;
  const lift = anim === 'attack' ? ([0.02, 0.04, 0.1, 0.07, 0.03][i] ?? 0) : anim === 'death' ? -0.12 * i : 0.02;
  const roll = anim === 'walk' ? (i / 6) * ((Math.PI * 2) / SPOKES) : anim === 'attack' ? recoil / WHEEL_R : 0;
  const bump = anim === 'walk' ? 0.4 * Math.abs(Math.sin((Math.PI * 2 * i) / 6)) : 0;
  const C: Xform = translation([recoil, 0, bump]);
  const at = (p: V3): V3 => applyPoint(C, p);

  // Carriage cheeks slope from the axle down to the trail on the ground.
  const trailEnd: V3 = [-20.5, 0, 1.6];
  const trailDir = norm(sub(trailEnd, AXLE));
  for (const s of [1, -1]) {
    const a = at([AXLE[0] + 2.5, s * 3.3, AXLE[2] + 1.6]);
    const b = at([trailEnd[0], s * 1.6, trailEnd[2] + 1.6]);
    const mid: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const half = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 2;
    fig.box(mid, axesAlong(sub(b, a), [0, 1, 0]), [half, 0.95, 2.3], M.team);
  }
  fig.box(at([trailEnd[0] + 1.2, 0, trailEnd[2] + 1.2]), axesAlong(trailDir, [0, 1, 0]), [1.4, 2.4, 1.5], M.darkWood);
  fig.box(at(AXLE), [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [1.6, 6.6, 1.3], M.darkWood);

  // Wheels: iron-tyred rims of short segments with turning spokes.
  for (const s of [1, -1]) {
    const hub = at([AXLE[0], s * 7.6, AXLE[2]]);
    const ax: V3 = [0, s, 0];
    const rimPoint = (a: number): V3 => add(hub, rotate([WHEEL_R, 0, 0], ax, a * s));
    const N = 14;
    for (let k = 0; k < N; k++) {
      fig.capsule(rimPoint((k / N) * Math.PI * 2), rimPoint(((k + 1) / N) * Math.PI * 2), 1.05, M.darkWood);
    }
    for (let k = 0; k < SPOKES; k++) {
      fig.capsule(hub, rimPoint(roll + (k / SPOKES) * Math.PI * 2), 0.55, M.wood);
    }
    fig.cone(madd(hub, ax, -1.4), madd(hub, ax, 1.6), 1.9, 1.5, M.iron);
  }

  // Bronze barrel on trunnions, elevated a little.
  const pivot = at([0, 0, 12.6]);
  const B: Xform = compose(C, rotationAbout([0, 0, 12.6], [0, 1, 0], -lift));
  const bp = (p: V3): V3 => applyPoint(B, p);
  fig.capsule(madd(pivot, [0, 1, 0], 3.4), madd(pivot, [0, 1, 0], -3.4), 1.0, M.bronze);
  fig.cone(bp([-6, 0, 12.6]), bp([15.5, 0, 13.4]), 3.2, 2.1, M.bronze);
  fig.cone(bp([14.8, 0, 13.4]), bp([17.2, 0, 13.45]), 2.55, 2.5, M.bronze);
  fig.cone(bp([17.1, 0, 13.45]), bp([17.3, 0, 13.45]), 1.25, 1.25, M.black);
  fig.sphere(bp([-7.0, 0, 12.6]), 1.7, M.bronze);

  if (anim === 'attack' && (i === 2 || i === 3)) {
    // Muzzle smoke puff.
    const k = i === 2 ? 1 : 1.5;
    const m = bp([21 + 3 * k, 0, 14]);
    fig.sphere(m, 3.0 * k, SMOKE);
    fig.sphere(madd(m, [0.6, 0.6, 0.4], 3.2 * k), 2.4 * k, SMOKE);
    fig.sphere(madd(m, [0.5, -0.7, 0.6], 3.0 * k), 2.2 * k, SMOKE);
  }
}

/** Death: the right wheel gives way and the gun tips over. */
export function cannonFall(i: number): Xform {
  return rotationAbout([0, -9, 0], [1, 0, 0], [0.1, 0.22, 0.34, 0.4][i] ?? 0);
}
