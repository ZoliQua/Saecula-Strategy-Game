import { axesAlong, type Axes, type Figure } from '../figure';
import type { HatDef, ShieldPainter, WeaponStyleDef } from '../gear';
import type { WeaponPose } from '../humanoid';
import { M } from '../materials';
import { add, dot, madd, norm, rotate, scale, sub, type V3, type Xform } from '../rigMath';
import { OTTOMAN_M } from './ottomanMaterials';

const O = OTTOMAN_M;

/*
 * Ottoman headgear, shield and bow (M21): one silhouette cue per age —
 * the kranos, a crested steel bowl with a nasal, cheek pieces and a team
 * horsehair crest running front to back, and the tall oval shield in a
 * brass rim (Római kor); the turban-wrapped spiked helm (sarık over a
 * conical chichak bowl, a mail aventail at the nape) on the knight and
 * the pikeman (Középkor); the börk, the janissaries' tall white felt
 * cap whose crown hangs folded down the back, with its brass spoon-
 * holder plate in front, on the musketeer (Felvilágosodás). The
 * janissary (M21) wears the börk with a tall team plume in the holder and
 * carries the short composite recurve bow. The villager wears a felt
 * takke in a linen wrap. Registered in gearRegistry.ts.
 */

/** Head-local point: hc + f·p0 + l·p1 + u·p2. */
const at = (hc: V3, [f, l, u]: Axes, p: V3): V3 => madd(madd(madd(hc, f, p[0]), l, p[1]), u, p[2]);

/** Kranos (crested helm): a steel bowl, brass brow band, nasal and cheek pieces, a team crest from brow to nape on a brass ridge. */
export function kranos(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.sphere(hp([-0.2, 0, 1.0]), 6.95, M.steel, { n: norm(add(u, scale(f, 0.35))), at: hp([0, 0, -0.2]) });
  fig.cone(hp([-0.2, 0, 0.1]), hp([-0.2, 0, 1.4]), 7.2, 7.05, M.brass);
  fig.box(hp([6.9, 0, -1.6]), axes, [0.45, 0.8, 3.0], M.steel);
  for (const s of [1, -1]) fig.box(hp([2.2, s * 6.2, -2.8]), axes, [2.3, 0.55, 3.2], M.steel);
  fig.box(hp([-0.4, 0, 7.4]), axes, [6.6, 0.55, 0.6], M.brass);
  // The crest: a fore-and-aft half-disc of team horsehair, sweeping down behind.
  fig.ellipsoid(hp([-1.2, 0, 7.6]), [rotate(f, l, 0.25), l, rotate(u, l, 0.25)], [8.4, 1.5, 5.6], M.team, { n: u, at: hp([0, 0, 7.4]) });
}

/** Turban-wrapped spiked helm: two rolls of white linen round the brow, a steel cone with a tall spike above, a mail aventail at the nape. */
export function turbanHelm(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  const nape: Axes = [rotate(f, l, 0.5), l, rotate(u, l, 0.5)];
  fig.ellipsoid(hp([-4.6, 0, -2.4]), nape, [3.0, 6.6, 3.4], M.mail);
  fig.sphere(hp([-0.2, 0, 1.2]), 6.9, M.steel, { n: u, at: hp([0, 0, 0.8]) });
  fig.ellipsoid(hp([-0.2, 0, 1.6]), axes, [8.2, 8.2, 2.5], O.turban);
  fig.ellipsoid(hp([-0.4, 0, 4.0]), [rotate(f, l, -0.12), l, rotate(u, l, -0.12)], [7.4, 7.4, 2.2], O.turban);
  fig.cone(hp([-0.3, 0, 4.6]), hp([-0.3, 0, 12.4]), 5.6, 1.0, M.steel);
  fig.capsule(hp([-0.3, 0, 12.0]), hp([-0.3, 0, 17.4]), 0.55, M.steel);
  fig.sphere(hp([-0.3, 0, 12.6]), 1.2, M.brass);
  fig.box(hp([6.6, 0, -0.8]), axes, [0.45, 0.75, 3.2], M.steel);
}

/** The börk: a white felt band round the head, the tall crown rising and then hanging folded down the back, a brass plate in front. */
function borkBody(fig: Figure, hp: (p: V3) => V3, axes: Axes): void {
  const [, , u] = axes;
  fig.ellipsoid(hp([-0.3, 0, 1.6]), axes, [7.5, 7.5, 3.0], O.felt, { n: u, at: hp([0, 0, -0.6]) });
  fig.cone(hp([-0.6, 0, 3.0]), hp([-1.6, 0, 13.6]), 6.6, 5.6, O.felt);
  fig.sphere(hp([-2.2, 0, 13.6]), 5.4, O.felt);
  // The fold: the felt hanging from the crown down the back to the shoulders.
  fig.capsule(hp([-5.2, 0, 12.6]), hp([-9.2, 0, 2.0]), 4.4, O.felt);
  fig.capsule(hp([-6.4, 0, 12.0]), hp([-10.4, 0, 1.6]), 2.0, O.feltShade);
  // The brass spoon-holder plate on the front of the band.
  fig.box(hp([7.4, 0, 3.6]), axes, [0.45, 1.8, 2.6], O.brass);
}

/** Börk (musketeer): the tall white felt cap with its folded crown and the brass plate. */
export function bork(fig: Figure, hc: V3, axes: Axes): void {
  borkBody(fig, (p) => at(hc, axes, p), axes);
}

/** Plumed börk (janissary): the börk with a tall team-coloured plume (sorguç) rising from a brass holder on its front plate. */
export function borkPlume(fig: Figure, hc: V3, axes: Axes): void {
  const hp = (p: V3): V3 => at(hc, axes, p);
  borkBody(fig, hp, axes);
  fig.capsule(hp([7.8, 0, 5.4]), hp([8.2, 0, 10.0]), 0.8, O.brass);
  fig.sphere(hp([8.2, 0, 10.0]), 1.3, O.brass);
  fig.capsule(hp([8.2, 0, 10.4]), hp([7.4, 0, 18.4]), 2.0, M.team);
  fig.capsule(hp([7.4, 0, 18.4]), hp([4.6, 0, 22.6]), 1.4, M.team);
}

/** Takke (villager): a low team felt cap in a wrap of linen. */
export function takke(fig: Figure, hc: V3, axes: Axes): void {
  const [, , u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.ellipsoid(hp([-0.3, 0, 2.2]), axes, [6.9, 6.9, 6.2], M.team, { n: u, at: hp([0, 0, 1.6]) });
  fig.ellipsoid(hp([-0.3, 0, 2.2]), axes, [7.5, 7.5, 1.9], O.turban);
}

/** Shield on the left forearm, facing forward-left of the torso (baseGear's frame). */
function shieldFrame(hand: V3, T: Xform, lift: number): { face: V3; axes: Axes; c: V3 } {
  const face = norm(rotate(T.x, T.z, 0.42));
  const axes = axesAlong(face, T.y);
  return { face, axes, c: madd(madd(hand, face, 2.0), T.z, lift) };
}

/** Oval shield: a tall team field in a brass rim, a steel boss in a green ring. */
export function ovalShield(fig: Figure, hand: V3, T: Xform): void {
  const { face, axes, c } = shieldFrame(hand, T, 2.0);
  fig.ellipsoid(madd(c, face, -0.4), axes, [0.8, 6.9, 10.6], M.brass);
  fig.ellipsoid(c, axes, [1.1, 6.2, 9.9], M.team);
  fig.ellipsoid(madd(c, face, 0.8), axes, [0.4, 2.8, 2.8], O.green);
  fig.sphere(madd(c, face, 1.1), 2.0, M.steel);
}

/** Composite recurve bow: short horn limbs bending back to the archer, the tips flicking forward, a green grip. */
function recurveBow(fig: Figure, w: WeaponPose, axis: V3): void {
  const half = 12;
  const bend = 3.8;
  const flick = 9.0;
  const fwd = norm(sub([1, 0, 0], scale(axis, dot([1, 0, 0], axis))));
  const point = (t: number): V3 => {
    const tip = Math.max(0, Math.abs(t) - 0.62);
    return madd(madd(w.at, axis, half * t), fwd, -bend * t * t + flick * tip * tip);
  };
  const N = 8;
  for (let i = 0; i < N; i++) {
    const t0 = -1 + (2 * i) / N;
    const t1 = -1 + (2 * (i + 1)) / N;
    fig.capsule(point(t0), point(t1), 1.5 - 0.6 * Math.abs((t0 + t1) / 2), O.horn);
  }
  fig.capsule(point(-0.16), point(0.16), 1.7, O.green);
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

export const OTTOMAN_HATS = {
  kranos: { draw: kranos, coversHead: false },
  turbanHelm: { draw: turbanHelm, coversHead: false },
  bork: { draw: bork, coversHead: false },
  borkPlume: { draw: borkPlume, coversHead: false },
  takke: { draw: takke, coversHead: false },
} satisfies Record<string, HatDef>;

export const OTTOMAN_SHIELDS = { ovalShield } satisfies Record<string, ShieldPainter>;

export const OTTOMAN_WEAPON_STYLES = {
  recurve: { kind: 'bow', draw: (fig, w, d) => recurveBow(fig, w, d) },
} satisfies Record<string, WeaponStyleDef>;
