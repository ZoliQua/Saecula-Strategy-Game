import { drawBow } from '../baseGear';
import { axesAlong, type Axes, type Figure } from '../figure';
import type { BackItemPainter, HatDef, ShieldPainter, WeaponStyleDef } from '../gear';
import { M, type Material } from '../materials';
import { madd, norm, rotate, scale, type V3, type Xform } from '../rigMath';
import { ENGLISH_M } from './englishMaterials';

/*
 * English headgear and shields (M4 design decision 5): the sallet with
 * its swept tail, the grenadier's mitre cap, the light dragoon's
 * Tarleton helmet with a bearskin crest, and the heater shield bearing
 * St George's cross on a team-coloured rim; the yew longbow and the
 * arming sword as weapon styles. The longbowman (M8) wears a broad
 * kettle war hat and carries his arrows thrust through the belt.
 * Registered in gearRegistry.ts.
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
const LONGBOW = { half: 19.5, bend: 4.6, thick: 1.25, wood: ENGLISH_M.yew as Material } as const;

/** Straight arming sword: wrapped grip, wheel pommel, wide straight cross-guard, long tapering blade. */
function armingSword(fig: Figure, at: (k: number) => V3, side: V3): void {
  fig.capsule(at(-2.4), at(1.4), 0.8, M.darkLeather);
  fig.sphere(at(-3.0), 1.3, M.steel);
  fig.capsule(madd(at(1.8), side, -3.6), madd(at(1.8), side, 3.6), 0.65, M.steel);
  fig.cone(at(2.2), at(15.2), 1.15, 0.7, M.steel);
  fig.cone(at(15.2), at(17.4), 0.7, 0.05, M.steel);
}

/** Kettle war hat: a ridged steel skull with a broad brim sloping down all round (the longbowman's). */
export function warHat(fig: Figure, hc: V3, axes: Axes): void {
  const u = axes[2];
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.ellipsoid(hp([-0.2, 0, 2.0]), axes, [6.9, 6.9, 7.6], M.steel, { n: u, at: hp([0, 0, 1.8]) });
  fig.cone(hp([-0.2, 0, 2.6]), hp([-0.2, 0, 0.6]), 7.4, 12.2, M.darkSteel);
  fig.cone(hp([-0.2, 0, 0.7]), hp([-0.2, 0, 0.1]), 12.2, 12.4, M.steel);
  fig.capsule(hp([6.0, 0, 6.2]), hp([-6.4, 0, 6.2]), 0.85, M.darkSteel);
  fig.capsule(hp([0, 0, 9.6]), hp([0, 0, 9.0]), 1.1, M.darkSteel);
}

/** A sheaf of arrows thrust through the belt at the right hip: heads down, grey fletching up by the ribs. */
const beltArrows: BackItemPainter = (fig, torso) => {
  for (const [dx, dy, lean] of [[1.4, -5.6, 0], [0.2, -6.1, 0.5], [-1.0, -5.9, 1.0], [2.4, -5.0, -0.5]] as const) {
    const head = torso([dx + 0.6, dy - lean * 0.3, -3.4]);
    const nock = torso([dx - 0.8, dy - 0.9 - lean * 0.4, 10.6]);
    fig.capsule(head, nock, 0.42, M.wood);
    fig.cone(head, torso([dx + 0.75, dy - lean * 0.3, -5.6]), 0.75, 0.05, M.steel);
    fig.capsule(torso([dx - 0.6, dy - 0.85 - lean * 0.38, 7.6]), nock, 0.9, ENGLISH_M.fletching);
  }
};

export const ENGLISH_HATS = {
  sallet: { draw: sallet, coversHead: false },
  mitre: { draw: mitre, coversHead: false },
  tarleton: { draw: tarleton, coversHead: false },
  warHat: { draw: warHat, coversHead: false },
} satisfies Record<string, HatDef>;

export const ENGLISH_BACK_ITEMS = { beltArrows } satisfies Record<string, BackItemPainter>;

export const ENGLISH_SHIELDS = { stGeorge: stGeorgeShield } satisfies Record<string, ShieldPainter>;

export const ENGLISH_WEAPON_STYLES = {
  longbow: { kind: 'bow', draw: (fig, w, d) => drawBow(fig, w, d, LONGBOW.half, LONGBOW.bend, LONGBOW.thick, LONGBOW.wood) },
  arming: { kind: 'gladius', draw: (fig, w, d, side) => armingSword(fig, (k) => madd(w.at, d, k), side) },
} satisfies Record<string, WeaponStyleDef>;
