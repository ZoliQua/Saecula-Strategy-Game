import { axesAlong, type Axes, type Figure } from '../figure';
import type { HatDef, ShieldPainter } from '../gear';
import { M } from '../materials';
import { madd, norm, rotate, scale, type V3, type Xform } from '../rigMath';
import { FINNISH_M } from './finnishMaterials';

const F = FINNISH_M;

/*
 * Finnish headgear and shields (M5): one silhouette cue per age — a low
 * team-cloth cap on a thick roll of bear fur and the round lime-wood
 * shield of the Iron Age (Römerzeit); a low conical nasal helm, plain
 * steel with no knob and no aventail, and the knight's heater shield
 * with the Nordic cross (Középkor); the hakkapeliitta's lobster-pot
 * helm — a round skull, a peak, a sliding nasal and a laminated neck
 * tail — and the musketeer's round grey karvalakki with its ear flaps
 * tied up over the crown (Felvilágosodás). Registered in
 * gearRegistry.ts.
 */

/** Head-local point: hc + f·p0 + l·p1 + u·p2. */
const at = (hc: V3, [f, l, u]: Axes, p: V3): V3 => madd(madd(madd(hc, f, p[0]), l, p[1]), u, p[2]);

/** Fur cap: a low team-cloth crown, drawn up to a blunt point, on a thick roll of bear fur. */
export function furCap(fig: Figure, hc: V3, axes: Axes): void {
  const [, , u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.sphere(hp([-0.4, 0, 1.6]), 6.8, M.team, { n: u, at: hp([0, 0, 1.2]) });
  fig.cone(hp([-0.4, 0, 4.0]), hp([-0.9, 0, 9.4]), 5.6, 2.2, M.team);
  fig.cone(hp([-0.4, 0, 0.0]), hp([-0.4, 0, 3.8]), 8.1, 7.8, F.fur);
}

/** Nasal helm: a plain steel bowl drawn into a low, blunt cone, a dark brow band and a nasal; no knob, no aventail. */
export function nasalHelm(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.sphere(hp([-0.2, 0, 1.0]), 7.0, M.steel, { n: u, at: hp([0, 0, 0.4]) });
  fig.cone(hp([-0.2, 0, 3.4]), hp([-0.4, 0, 10.2]), 6.3, 0.9, M.steel);
  fig.cone(hp([-0.2, 0, 0.2]), hp([-0.2, 0, 1.8]), 7.2, 7.1, M.darkSteel);
  fig.box(hp([7.0, 0, -1.8]), [f, l, u], [0.5, 0.95, 3.4], M.steel);
}

/**
 * Lobster-pot helm (zischägge) of the hakkapeliitta: a round blackened
 * skull with a small knob, a fixed peak with a sliding nasal through
 * it, cheek pieces, and a tail of three lames down the nape.
 */
export function lobsterPot(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  // The tail first, lame by lame, each a little lower and further out.
  for (let k = 0; k < 3; k++) {
    const tilt: Axes = [rotate(f, l, -0.5 - k * 0.25), l, rotate(u, l, -0.5 - k * 0.25)];
    fig.ellipsoid(hp([-5.6 - k * 1.3, 0, -1.2 - k * 2.8]), tilt, [1.4, 6.4 - k * 0.3, 2.2], F.blackIron);
  }
  for (const s of [1, -1]) fig.box(hp([2.6, s * 6.2, -3.0]), axes, [2.2, 0.55, 3.2], F.blackIron);
  fig.sphere(hp([-0.3, 0, 1.4]), 7.1, F.blackIron, { n: u, at: hp([0, 0, 0.2]) });
  fig.sphere(hp([-0.3, 0, 8.4]), 1.3, M.steel);
  fig.box(hp([6.2, 0, 1.0]), [rotate(f, l, 0.35), l, rotate(u, l, 0.35)], [3.0, 5.0, 0.45], F.blackIron);
  fig.capsule(hp([7.6, 0, 6.6]), hp([7.7, 0, -3.8]), 0.5, M.steel);
}

/** Karvalakki: a round cap of grey sheepskin, its two ear flaps tied up over the crown with a cord. */
export function karvalakki(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.ellipsoid(hp([-0.4, 0, 3.0]), axes, [8.0, 8.0, 6.6], F.greyFur, { n: u, at: hp([0, 0, -1.0]) });
  fig.sphere(hp([-0.4, 0, 6.6]), 5.4, M.team);
  // The ear flaps, folded up the sides and tied at the top.
  for (const s of [1, -1]) {
    const flap: Axes = [f, rotate(l, f, s * 0.42), rotate(u, f, s * 0.42)];
    fig.ellipsoid(hp([-0.4, s * 6.4, 6.4]), flap, [4.6, 1.5, 4.2], F.greyFur);
  }
  fig.sphere(hp([-0.4, 0, 11.2]), 1.2, M.darkLeather);
}

/** Shield on the left forearm, facing forward-left of the torso (baseGear's frame). */
function shieldFrame(hand: V3, T: Xform, lift: number): { face: V3; axes: Axes; c: V3 } {
  const face = norm(rotate(T.x, T.z, 0.42));
  const axes = axesAlong(face, T.y);
  return { face, axes, c: madd(madd(hand, face, 2.0), T.z, lift) };
}

/** Round lime-wood shield: a broad team field in a thin rim of pale lime wood, a small iron boss. */
export function limeShield(fig: Figure, hand: V3, T: Xform): void {
  const { face, axes, c } = shieldFrame(hand, T, 1.8);
  fig.ellipsoid(madd(c, face, -0.4), axes, [0.8, 8.4, 8.4], F.lime);
  fig.ellipsoid(c, axes, [1.1, 7.7, 7.7], M.team);
  fig.sphere(madd(c, face, 1.0), 1.9, M.iron);
}

/** Heater shield: the Nordic cross on a white field inside a team rim, the field outlined dark. */
export function crossShield(fig: Figure, hand: V3, T: Xform): void {
  const { face, axes, c } = shieldFrame(hand, T, 2.5);
  fig.ellipsoid(c, axes, [1.4, 6.4, 8.6], F.crossShield, { n: scale(T.z, -1), at: madd(c, T.z, 4.8) });
  fig.sphere(madd(c, face, 1.2), 0.9, M.darkSteel);
}

export const FINNISH_HATS = {
  furCap: { draw: furCap, coversHead: false },
  nasalHelm: { draw: nasalHelm, coversHead: false },
  lobsterPot: { draw: lobsterPot, coversHead: false },
  karvalakki: { draw: karvalakki, coversHead: false },
} satisfies Record<string, HatDef>;

export const FINNISH_SHIELDS = { limeShield, crossShield } satisfies Record<string, ShieldPainter>;
