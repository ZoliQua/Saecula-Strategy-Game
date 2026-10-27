import { axesAlong, type Axes, type Figure } from '../figure';
import { M, type Material } from '../materials';
import { madd, norm, rotate, scale, type V3, type Xform } from '../rigMath';
import { ENGLISH_M } from './englishMaterials';

/*
 * English headgear and shields (M4 design decision 5): the sallet with
 * its swept tail, the grenadier's mitre cap, the light dragoon's
 * Tarleton helmet with a bearskin crest, and the heater shield bearing
 * St George's cross on a team-coloured rim.
 */

/** Head-local point: hc + f·p0 + l·p1 + u·p2. */
const at = (hc: V3, [f, l, u]: Axes, p: V3): V3 => madd(madd(madd(hc, f, p[0]), l, p[1]), u, p[2]);

/** Sallet: steel bowl down to the brow with a low comb, flaring into a long tail over the nape. */
export function sallet(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  // Bowl, cut on a plane that rises towards the brow: open face, deep at the nape.
  fig.sphere(hp([-0.5, 0, 1.0]), 7.05, M.steel, { n: norm(madd(u, f, -0.55)), at: hp([0, 0, -0.9]) });
  // Swept tail: a flattened shell behind and below the bowl, tilted down at the back.
  const back = rotate(f, l, -0.5);
  const up = rotate(u, l, -0.5);
  fig.ellipsoid(hp([-5.0, 0, -2.6]), [back, l, up], [5.8, 7.6, 1.6], M.steel, { n: scale(f, -1), at: hp([-1.2, 0, 0]) });
  // Low comb along the crown.
  fig.capsule(hp([3.8, 0, 6.1]), hp([-4.6, 0, 5.4]), 0.75, M.darkSteel);
}

/** Grenadier mitre cap: tall team-coloured front plate leaning back, cloth bag behind, brass badge and tassel. */
export function mitre(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.sphere(hp([-0.3, 0, 1.6]), 6.7, M.team, { n: u, at: hp([0, 0, 1.2]) });
  fig.cone(hp([-1.0, 0, 3.0]), hp([-1.8, 0, 14.6]), 6.1, 1.6, M.team);
  const lean = rotate(u, l, -0.2);
  const plate: Axes = [rotate(f, l, -0.2), l, lean];
  const pc = madd(hp([4.6, 0, 3.0]), lean, 6.0);
  fig.box(pc, plate, [0.55, 5.4, 6.4], M.team);
  fig.box(madd(pc, plate[0], 0.45), plate, [0.25, 5.5, 0.45], M.gold);
  fig.ellipsoid(madd(madd(pc, plate[0], 0.6), lean, -2.6), plate, [0.35, 2.6, 2.4], M.brass);
  fig.sphere(madd(pc, lean, 7.2), 1.5, ENGLISH_M.wool);
}

/** Tarleton helmet: black leather skull with a team turban band, peak and a bearskin crest front to back. */
export function tarleton(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.sphere(hp([-0.4, 0, 1.6]), 6.9, M.black, { n: u, at: hp([0, 0, 0.6]) });
  fig.cone(hp([0, 0, 1.0]), hp([0, 0, 3.4]), 7.05, 6.85, M.team);
  fig.box(hp([5.8, 0, 1.0]), [rotate(f, l, 0.32), l, rotate(u, l, 0.32)], [2.2, 4.6, 0.4], M.black);
  fig.capsule(hp([4.4, 0, 7.2]), hp([-5.4, 0, 6.3]), 2.35, ENGLISH_M.bearskin);
  fig.sphere(hp([-5.6, 0, 6.0]), 2.5, ENGLISH_M.bearskin);
  fig.capsule(hp([0.4, 6.4, 3.4]), hp([-0.6, 6.0, 10.4]), 1.2, ENGLISH_M.wool);
}

/** Heater shield with St George's cross; a team-coloured rim shows round the white field. */
export function stGeorgeShield(fig: Figure, hand: V3, T: Xform): void {
  const face = norm(rotate(T.x, T.z, 0.42));
  const axes = axesAlong(face, T.y);
  const c = madd(madd(hand, face, 2.2), T.z, 2.2);
  const clip = { n: scale(T.z, -1), at: madd(c, T.z, 5.4) };
  fig.ellipsoid(c, axes, [1.5, 6.9, 9.4], ENGLISH_M.stGeorgeShield, clip);
  fig.sphere(madd(c, face, 1.2), 0.9, M.darkSteel);
}

/** Tall self bow of yew (longbow): held like the bow, but about the archer's height. */
export const LONGBOW = { half: 19.5, bend: 4.6, thick: 1.25, wood: ENGLISH_M.yew as Material } as const;
