import { axesAlong, type Axes, type Figure } from './figure';
import type { BackItemPainter, HatDef, ShieldPainter } from './gear';
import type { WeaponPose } from './humanoid';
import { M, type Material } from './materials';
import { add, cross, dot, madd, norm, rotate, scale, sub, type V3, type Xform } from './rigMath';

/*
 * The shared base gear (the Hungarian look): hats, shields and back
 * items by id, registered in gearRegistry.ts next to each civ's own.
 * Also the bow painter, which civ weapon styles reuse with their own
 * proportions (the English longbow).
 */

/** Head-local point: hc + f·p0 + l·p1 + u·p2. */
const headPoint =
  (hc: V3, [f, l, u]: Axes) =>
  (p: V3): V3 =>
    madd(madd(madd(hc, f, p[0]), l, p[1]), u, p[2]);

/** Helmets, hats and hoods around the head centre `hc` (head axes fwd/left/up). */
export const BASE_HATS = {
  straw: {
    coversHead: false,
    draw: (fig, hc, axes) => {
      const hp = headPoint(hc, axes);
      fig.cone(hp([0, 0, 2.5]), hp([0, 0, 3.2]), 10.6, 10.2, M.straw);
      fig.cone(hp([0, 0, 3.0]), hp([0, 0, 8.4]), 5.1, 3.5, M.strawDark);
      fig.cone(hp([0, 0, 3.1]), hp([0, 0, 4.5]), 5.25, 4.95, M.team);
    },
  },
  hood: {
    coversHead: true,
    draw: (fig, hc, axes) => {
      const hp = headPoint(hc, axes);
      fig.sphere(hp([-1.5, 0, 0.9]), 7.3, M.team, { n: scale(axes[0], -1), at: hp([3.3, 0, 0]) });
      fig.cone(hp([-5.2, 0, 3.2]), hp([-9.8, 0, -1.8]), 3.1, 0.5, M.team);
      fig.ellipsoid(hp([-0.6, 0, -7.6]), axes, [5.6, 7.7, 2.7], M.team);
    },
  },
  galea: {
    coversHead: false,
    draw: (fig, hc, axes) => {
      const hp = headPoint(hc, axes);
      const [f, , u] = axes;
      fig.sphere(hp([-0.3, 0, 0.8]), 6.95, M.steel, { n: norm(add(u, scale(f, 0.5))), at: hp([0, 0, -0.4]) });
      fig.ellipsoid(hp([-0.8, 0, 7.6]), axes, [6.2, 1.3, 2.7], M.crest);
      for (const s of [1, -1]) fig.box(hp([2.3, s * 5.7, -2.4]), axes, [2.3, 0.6, 3.0], M.steel);
    },
  },
  kettle: {
    coversHead: false,
    draw: (fig, hc, axes) => {
      const hp = headPoint(hc, axes);
      fig.sphere(hp([0, 0, 1.4]), 6.85, M.steel, { n: axes[2], at: hp([0, 0, 2.4]) });
      fig.cone(hp([0, 0, 2.0]), hp([0, 0, 2.8]), 10.4, 9.8, M.darkSteel);
    },
  },
  coif: {
    coversHead: false,
    draw: (fig, hc, axes) => {
      const hp = headPoint(hc, axes);
      fig.sphere(hp([-0.6, 0, 0.5]), 7.0, M.mail, { n: scale(axes[0], -1), at: hp([3.8, 0, 0]) });
      fig.ellipsoid(hp([-0.4, 0, -7.4]), axes, [5.8, 7.6, 2.6], M.mail);
      fig.sphere(hp([-0.2, 0, 2.8]), 6.0, M.leather, { n: axes[2], at: hp([0, 0, 4.4]) });
    },
  },
  tricorne: {
    coversHead: false,
    draw: (fig, hc, axes) => {
      const hp = headPoint(hc, axes);
      const [f, l, u] = axes;
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
    },
  },
  cap: {
    coversHead: false,
    draw: (fig, hc, axes) => {
      const hp = headPoint(hc, axes);
      const [f, l, u] = axes;
      fig.sphere(hp([-0.4, 0, 1.2]), 6.75, M.team, { n: u, at: hp([0, 0, 1.0]) });
      fig.box(hp([5.4, 0, 1.3]), [rotate(f, l, 0.25), l, rotate(u, l, 0.25)], [2.3, 4.4, 0.45], M.leather);
    },
  },
  greatHelm: {
    coversHead: true,
    draw: (fig, hc, axes) => {
      const hp = headPoint(hc, axes);
      fig.cone(hp([0, 0, -6.2]), hp([0, 0, 5.8]), 6.8, 6.5, M.steel);
      fig.box(hp([6.45, 0, 1.0]), axes, [0.7, 4.9, 0.6], M.black);
      fig.cone(hp([0, 0, 4.6]), hp([0, 0, 5.6]), 6.9, 6.75, M.gold);
      fig.ellipsoid(hp([-1.0, 0, 9.6]), axes, [2.7, 2.2, 4.2], M.team);
      fig.ellipsoid(hp([-3.6, 0, 10.6]), axes, [2.4, 2.0, 3.4], M.team);
    },
  },
  shako: {
    coversHead: false,
    draw: (fig, hc, axes) => {
      const hp = headPoint(hc, axes);
      const [f, l, u] = axes;
      fig.cone(hp([0, 0, 1.6]), hp([0, 0, 11.6]), 6.1, 6.9, M.black);
      fig.cone(hp([0, 0, 10.4]), hp([0, 0, 11.4]), 6.95, 7.05, M.gold);
      fig.box(hp([5.7, 0, 2.2]), [rotate(f, l, 0.3), l, rotate(u, l, 0.3)], [2.4, 4.6, 0.45], M.black);
      fig.box(hp([6.45, 0, 6.6]), axes, [0.45, 2.1, 2.5], M.gold);
      fig.capsule(hp([1.0, 0, 11.6]), hp([0.2, 0, 16.6]), 1.65, M.feather);
    },
  },
} satisfies Record<string, HatDef>;

/** Shield on the left forearm, facing forward-left of the torso. */
function shieldFrame(hand: V3, T: Xform, lift: number): { face: V3; axes: Axes; c: V3 } {
  const face = norm(rotate(T.x, T.z, 0.42));
  const axes = axesAlong(face, T.y);
  return { face, axes, c: madd(madd(hand, face, 2.0), T.z, lift) };
}

export const BASE_SHIELDS = {
  scutum: (fig, hand, T) => {
    const { face, axes, c } = shieldFrame(hand, T, 1.5);
    fig.box(c, axes, [0.9, 5.9, 8.8], M.team);
    for (const s of [1, -1]) {
      const wing = norm(add(scale(axes[1], s), scale(face, -0.42)));
      const wc = madd(madd(c, axes[1], s * 5.9), wing, 1.25);
      fig.box(wc, axesAlong(face, wing), [0.9, 1.4, 8.8], M.team);
    }
    fig.box(madd(c, face, 0.6), axes, [0.35, 6.0, 0.7], M.gold);
    fig.sphere(madd(c, face, 0.9), 2.0, M.brass);
  },
  heater: (fig, hand, T) => {
    const { face, axes, c } = shieldFrame(hand, T, 2.5);
    fig.ellipsoid(c, axes, [1.3, 5.6, 7.6], M.team, { n: scale(T.z, -1), at: madd(c, T.z, 4.2) });
    fig.box(madd(c, face, 1.0), axes, [0.3, 1.0, 5.6], M.gold, { n: scale(T.z, -1), at: madd(c, T.z, 4.2) });
  },
} satisfies Record<string, ShieldPainter>;

/** Gear slung on the back or the hip (`at` maps torso-local points to rig space). */
export const BASE_BACK_ITEMS = {
  quiver: (fig, at, T) => {
    const bottom = at([-4.9, 2.6, 2.5]);
    const top = at([-4.9, -2.2, 15.5]);
    fig.capsule(bottom, top, 1.9, M.leather);
    for (const [dy, dz] of [[0.8, 0.4], [-0.6, 1.0], [0.1, -0.6]] as const) {
      fig.sphere(add(madd(top, T.y, dy), [0, 0, 1.8 + dz]), 1.05, M.feather);
    }
  },
  // Bolt case on the right hip.
  bolts: (fig, at, T) => {
    const c = at([-1, -6.2, 1.5]);
    fig.box(c, [T.x, T.y, T.z], [1.6, 1.1, 3.2], M.leather);
    fig.sphere(madd(c, T.z, 3.6), 1.0, M.feather);
  },
} satisfies Record<string, BackItemPainter>;

/** A bow held at `w` along `axis`: limbs bent towards the archer, string, and the nocked arrow when loaded. */
export function drawBow(fig: Figure, w: WeaponPose, axis: V3, half = 12.5, bend = 4, thick = 1.4, wood: Material = M.wood): void {
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
