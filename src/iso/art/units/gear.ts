import { axesAlong, type Axes, type Figure } from './figure';
import type { WeaponPose } from './humanoid';
import { M, type Material } from './materials';
import { add, cross, dot, madd, norm, rotate, scale, sub, type V3, type Xform } from './rigMath';
import { LONGBOW, mitre, sallet, stGeorgeShield, tarleton } from './english/englishGear';

export type HatKind =
  | 'straw' | 'hood' | 'galea' | 'kettle' | 'coif' | 'tricorne' | 'cap' | 'greatHelm' | 'shako'
  | 'sallet' | 'mitre' | 'tarleton';
/** Weapon kinds (they also pick the pose, see poses.ts). */
export type WeaponKind = 'tool' | 'gladius' | 'sabre' | 'bow' | 'pike' | 'spear' | 'crossbow' | 'musket' | 'lance';
/** Visual variant of a weapon kind, posed like it: a yew longbow (bow), a longer arming sword (gladius). */
export type WeaponStyle = 'longbow' | 'arming';
export type ShieldKind = 'scutum' | 'heater' | 'stGeorge';

/** Helmets, hats and hoods around the head centre `hc` (head axes fwd/left/up). */
export function drawHat(fig: Figure, kind: HatKind, hc: V3, [f, l, u]: Axes): void {
  const hp = (p: V3): V3 => madd(madd(madd(hc, f, p[0]), l, p[1]), u, p[2]);
  const axes: Axes = [f, l, u];
  switch (kind) {
    case 'straw':
      fig.cone(hp([0, 0, 2.5]), hp([0, 0, 3.2]), 10.6, 10.2, M.straw);
      fig.cone(hp([0, 0, 3.0]), hp([0, 0, 8.4]), 5.1, 3.5, M.strawDark);
      fig.cone(hp([0, 0, 3.1]), hp([0, 0, 4.5]), 5.25, 4.95, M.team);
      break;
    case 'hood':
      fig.sphere(hp([-1.5, 0, 0.9]), 7.3, M.team, { n: scale(f, -1), at: hp([3.3, 0, 0]) });
      fig.cone(hp([-5.2, 0, 3.2]), hp([-9.8, 0, -1.8]), 3.1, 0.5, M.team);
      fig.ellipsoid(hp([-0.6, 0, -7.6]), axes, [5.6, 7.7, 2.7], M.team);
      break;
    case 'galea':
      fig.sphere(hp([-0.3, 0, 0.8]), 6.95, M.steel, { n: norm(add(u, scale(f, 0.5))), at: hp([0, 0, -0.4]) });
      fig.ellipsoid(hp([-0.8, 0, 7.6]), axes, [6.2, 1.3, 2.7], M.crest);
      for (const s of [1, -1]) fig.box(hp([2.3, s * 5.7, -2.4]), axes, [2.3, 0.6, 3.0], M.steel);
      break;
    case 'kettle':
      fig.sphere(hp([0, 0, 1.4]), 6.85, M.steel, { n: u, at: hp([0, 0, 2.4]) });
      fig.cone(hp([0, 0, 2.0]), hp([0, 0, 2.8]), 10.4, 9.8, M.darkSteel);
      break;
    case 'coif':
      fig.sphere(hp([-0.6, 0, 0.5]), 7.0, M.mail, { n: scale(f, -1), at: hp([3.8, 0, 0]) });
      fig.ellipsoid(hp([-0.4, 0, -7.4]), axes, [5.8, 7.6, 2.6], M.mail);
      fig.sphere(hp([-0.2, 0, 2.8]), 6.0, M.leather, { n: u, at: hp([0, 0, 4.4]) });
      break;
    case 'tricorne': {
      fig.ellipsoid(hp([0, 0, 4.4]), axes, [5.5, 5.5, 3.4], M.black, { n: u, at: hp([0, 0, 2.8]) });
      for (let k = 0; k < 3; k++) {
        const a = Math.PI / 3 + (k * 2 * Math.PI) / 3;
        const d = norm(add(scale(f, Math.cos(a)), scale(l, Math.sin(a))));
        const t = norm(add(scale(f, -Math.sin(a)), scale(l, Math.cos(a))));
        const up = norm(sub(u, scale(d, 0.45)));
        const c = madd(madd(hc, d, 4.6), u, 4.4);
        const plate: Axes = [t, cross(up, t), up];
        fig.box(c, plate, [8.6, 0.7, 2.1], M.black);
        fig.capsule(madd(madd(c, up, 2.0), t, -8.4), madd(madd(c, up, 2.0), t, 8.4), 0.55, M.gold);
      }
      fig.sphere(madd(madd(hc, norm(add(scale(f, 0.5), scale(l, 0.87))), 5.4), u, 5.6), 1.4, M.team);
      break;
    }
    case 'cap':
      fig.sphere(hp([-0.4, 0, 1.2]), 6.75, M.team, { n: u, at: hp([0, 0, 1.0]) });
      fig.box(hp([5.4, 0, 1.3]), [rotate(f, l, 0.25), l, rotate(u, l, 0.25)], [2.3, 4.4, 0.45], M.leather);
      break;
    case 'greatHelm':
      fig.cone(hp([0, 0, -6.2]), hp([0, 0, 5.8]), 6.8, 6.5, M.steel);
      fig.box(hp([6.45, 0, 1.0]), axes, [0.7, 4.9, 0.6], M.black);
      fig.cone(hp([0, 0, 4.6]), hp([0, 0, 5.6]), 6.9, 6.75, M.gold);
      fig.ellipsoid(hp([-1.0, 0, 9.6]), axes, [2.7, 2.2, 4.2], M.team);
      fig.ellipsoid(hp([-3.6, 0, 10.6]), axes, [2.4, 2.0, 3.4], M.team);
      break;
    case 'shako':
      fig.cone(hp([0, 0, 1.6]), hp([0, 0, 11.6]), 6.1, 6.9, M.black);
      fig.cone(hp([0, 0, 10.4]), hp([0, 0, 11.4]), 6.95, 7.05, M.gold);
      fig.box(hp([5.7, 0, 2.2]), [rotate(f, l, 0.3), l, rotate(u, l, 0.3)], [2.4, 4.6, 0.45], M.black);
      fig.box(hp([6.45, 0, 6.6]), axes, [0.45, 2.1, 2.5], M.gold);
      fig.capsule(hp([1.0, 0, 11.6]), hp([0.2, 0, 16.6]), 1.65, M.feather);
      break;
    case 'sallet':
      sallet(fig, hc, axes);
      break;
    case 'mitre':
      mitre(fig, hc, axes);
      break;
    case 'tarleton':
      tarleton(fig, hc, axes);
      break;
  }
}

/** Blade / head side of a weapon: perpendicular to `dir`, in the swing plane. */
function bladeSide(dir: V3): V3 {
  const s = cross([0, 1, 0], dir);
  return Math.hypot(s[0], s[1], s[2]) < 1e-4 ? [0, 0, -1] : norm(s);
}

/** The held weapon; `hands` are where the hands actually are. */
export function drawWeapon(fig: Figure, kind: WeaponKind, w: WeaponPose, _hands: { handL: V3; handR: V3 }, style?: WeaponStyle): void {
  const d = norm(w.dir);
  const at = (k: number): V3 => madd(w.at, d, k);
  const side = bladeSide(d);
  switch (kind) {
    case 'tool': {
      fig.capsule(at(-4), at(11.5), 0.95, M.wood);
      fig.box(at(11), axesAlong(side, d), [4.4, 0.85, 0.75], M.darkSteel);
      fig.sphere(madd(at(11), side, 4.4), 0.8, M.steel);
      break;
    }
    case 'gladius':
      if (style === 'arming') {
        armingSword(fig, at, side);
        break;
      }
      fig.capsule(at(-1.6), at(1.4), 0.85, M.darkWood);
      fig.sphere(at(-2.1), 1.25, M.brass);
      fig.capsule(madd(at(1.9), side, -2.6), madd(at(1.9), side, 2.6), 0.8, M.brass);
      fig.capsule(at(2.4), at(11.5), 1.1, M.steel);
      fig.cone(at(11.5), at(14), 1.1, 0.1, M.steel);
      break;
    case 'sabre': {
      fig.capsule(at(-1.6), at(1.4), 0.85, M.darkWood);
      fig.capsule(madd(at(1.8), side, -2.0), madd(at(-1.6), side, -1.8), 0.55, M.brass);
      let p = at(1.8);
      for (const [len, bend] of [[5, 0.25], [5, 0.7], [4.5, 1.3]] as const) {
        const q = madd(madd(p, d, len), side, bend);
        fig.capsule(p, q, 0.85, M.steel);
        p = q;
      }
      break;
    }
    case 'spear':
      fig.capsule(at(-12), at(20), 0.8, M.wood);
      fig.cone(at(19.5), at(25.5), 1.45, 0.05, M.steel);
      break;
    case 'pike':
      fig.capsule(at(-17), at(50), 0.8, M.darkWood);
      fig.cone(at(49.5), at(57), 1.4, 0.05, M.steel);
      break;
    case 'lance':
      fig.cone(at(-9), at(36), 1.15, 0.45, M.wood);
      fig.cone(at(0.4), at(3.6), 0.8, 3.0, M.steel);
      fig.box(madd(at(31), side, 2.1), axesAlong(d, side), [2.6, 2.0, 0.18], M.team);
      break;
    case 'bow':
      if (style === 'longbow') drawBow(fig, w, d, LONGBOW.half, LONGBOW.bend, LONGBOW.thick, LONGBOW.wood);
      else drawBow(fig, w, d);
      break;
    case 'crossbow':
      drawCrossbow(fig, w, d);
      break;
    case 'musket':
      fig.cone(at(-4.5), at(5.5), 1.75, 1.05, M.darkWood);
      fig.capsule(at(5.5), at(19), 0.9, M.wood);
      fig.capsule(at(3.5), at(27.5), 0.6, M.iron);
      fig.cone(madd(at(27), side, 0.8), madd(at(33.5), side, 0.8), 0.4, 0.05, M.steel);
      break;
  }
}

/** Straight arming sword: wrapped grip, wheel pommel, wide straight cross-guard, long tapering blade. */
function armingSword(fig: Figure, at: (k: number) => V3, side: V3): void {
  fig.capsule(at(-2.4), at(1.4), 0.8, M.darkLeather);
  fig.sphere(at(-3.0), 1.3, M.steel);
  fig.capsule(madd(at(1.8), side, -3.6), madd(at(1.8), side, 3.6), 0.65, M.steel);
  fig.cone(at(2.2), at(15.2), 1.15, 0.7, M.steel);
  fig.cone(at(15.2), at(17.4), 0.7, 0.05, M.steel);
}

function drawBow(fig: Figure, w: WeaponPose, axis: V3, half = 12.5, bend = 4, thick = 1.4, wood: Material = M.wood): void {
  // The bow's belly faces the target (rig forward, made perpendicular to the bow axis).
  const fwd = norm(sub([1, 0, 0], scale(axis, dot([1, 0, 0], axis))));
  const point = (t: number): V3 => madd(madd(w.at, axis, half * t), fwd, -bend * t * t);
  const N = 6;
  for (let i = 0; i < N; i++) {
    const t0 = -1 + (2 * i) / N;
    const t1 = -1 + (2 * (i + 1)) / N;
    const r = thick - 0.5 * (thick / 1.4) * Math.abs((t0 + t1) / 2);
    fig.capsule(point(t0), point(t1), r, wood);
  }
  const top = point(1);
  const bottom = point(-1);
  const nock = w.draw ?? madd(w.at, fwd, -bend);
  fig.capsule(top, nock, 0.32, M.string);
  fig.capsule(nock, bottom, 0.32, M.string);
  if (w.loaded) {
    const tip = madd(w.at, fwd, 4.5);
    const shaftDir = norm(sub(tip, nock));
    fig.capsule(nock, tip, 0.42, M.wood);
    fig.cone(tip, madd(tip, shaftDir, 2.2), 0.8, 0.05, M.steel);
    fig.sphere(madd(nock, shaftDir, 1.2), 0.85, M.feather);
  }
}

function drawCrossbow(fig: Figure, w: WeaponPose, d: V3): void {
  const at = (k: number): V3 => madd(w.at, d, k);
  let left = cross([0, 0, 1], d);
  left = Math.hypot(left[0], left[1], left[2]) < 1e-4 ? [0, 1, 0] : norm(left);
  // Slightly oversized so the crossbow reads at game zoom.
  fig.box(at(4.2), axesAlong(d, left), [9.2, 1.4, 1.6], M.wood);
  const prodC = at(12);
  const limb = (t: number): V3 => madd(madd(prodC, left, 10 * t), d, -2.8 * t * t);
  for (const s of [1, -1]) {
    fig.capsule(prodC, limb(s * 0.5), 1.25, M.darkSteel);
    fig.capsule(limb(s * 0.5), limb(s), 1.0, M.darkSteel);
  }
  const nut = w.loaded ? at(3.4) : at(11.2);
  fig.capsule(limb(1), nut, 0.3, M.string);
  fig.capsule(limb(-1), nut, 0.3, M.string);
  if (w.loaded) {
    fig.capsule(at(3.4), at(12.6), 0.5, M.wood);
    fig.cone(at(12.6), at(14.6), 0.85, 0.05, M.steel);
  }
}

/** Shield on the left forearm, facing forward-left of the torso. */
export function drawShield(fig: Figure, kind: ShieldKind, hand: V3, T: Xform): void {
  if (kind === 'stGeorge') {
    stGeorgeShield(fig, hand, T);
    return;
  }
  const face = norm(rotate(T.x, T.z, 0.42));
  const axes = axesAlong(face, T.y);
  const c = madd(madd(hand, face, 2.0), T.z, kind === 'scutum' ? 1.5 : 2.5);
  if (kind === 'scutum') {
    fig.box(c, axes, [0.9, 5.9, 8.8], M.team);
    for (const s of [1, -1]) {
      const wing = norm(add(scale(axes[1], s), scale(face, -0.42)));
      const wc = madd(madd(c, axes[1], s * 5.9), wing, 1.25);
      fig.box(wc, axesAlong(face, wing), [0.9, 1.4, 8.8], M.team);
    }
    fig.box(madd(c, face, 0.6), axes, [0.35, 6.0, 0.7], M.gold);
    fig.sphere(madd(c, face, 0.9), 2.0, M.brass);
  } else {
    fig.ellipsoid(c, axes, [1.3, 5.6, 7.6], M.team, { n: scale(T.z, -1), at: madd(c, T.z, 4.2) });
    fig.box(madd(c, face, 1.0), axes, [0.3, 1.0, 5.6], M.gold, { n: scale(T.z, -1), at: madd(c, T.z, 4.2) });
  }
}
