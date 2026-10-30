import { axesAlong, type Axes, type Figure } from '../figure';
import type { BackItemPainter, HatDef, ShieldPainter } from '../gear';
import { M } from '../materials';
import { add, madd, norm, rotate, scale, type V3, type Xform } from '../rigMath';
import { GERMAN_M } from './germanMaterials';

const G = GERMAN_M;

/*
 * German headgear and shields (M5): one silhouette cue per age — the
 * pointed Spangenhelm and the oval Germanic board shield with its iron
 * boss (Römerzeit), the Landsknecht's slashed beret with its sweep of
 * ostrich plumes and the knight's pot helm with the buffalo-horn crest
 * of German heraldry (Mittelalter), the spiked leather helm (Aufklärung).
 * The knight's heater shield bears the black eagle on gold. The
 * Landsknecht unique unit (M8) wears the great plumed beret and the
 * Katzbalger at the hip. Registered in gearRegistry.ts.
 */

/** Head-local point: hc + f·p0 + l·p1 + u·p2. */
const at = (hc: V3, [f, l, u]: Axes, p: V3): V3 => madd(madd(madd(hc, f, p[0]), l, p[1]), u, p[2]);

/** Spangenhelm: a steel bowl drawn up into a point, a gilt brow band, gilt ribs and a nasal. */
export function spangenhelm(fig: Figure, hc: V3, axes: Axes): void {
  const [f, , u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.sphere(hp([-0.2, 0, 1.0]), 6.9, M.steel, { n: u, at: hp([0, 0, 0.4]) });
  fig.cone(hp([-0.2, 0, 4.0]), hp([-0.6, 0, 13.2]), 5.6, 0.35, M.steel);
  fig.cone(hp([-0.2, 0, 0.3]), hp([-0.2, 0, 2.1]), 7.15, 7.0, M.brass);
  for (const [df, dl] of [[1, 0], [0, 1], [0, -1], [-1, 0]] as const) {
    fig.capsule(hp([-0.2 + df * 6.6, dl * 6.6, 1.8]), hp([-0.5 + df * 1.0, dl * 1.0, 11.2]), 0.5, M.brass);
  }
  fig.box(hp([6.8, 0, -1.4]), [f, axes[1], u], [0.45, 0.8, 2.8], M.steel);
}

/** Landsknecht beret: a wide slashed team beret cocked to one side, ostrich plumes sweeping up and back. */
export function landsknechtBeret(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.sphere(hp([-0.3, 0, 1.6]), 6.6, M.team, { n: u, at: hp([0, 0, 1.4]) });
  const tilt: Axes = [f, rotate(l, f, 0.22), rotate(u, f, 0.22)];
  fig.ellipsoid(hp([0.4, 1.4, 5.4]), tilt, [9.0, 9.6, 2.0], G.slashed);
  // Plumes on the cocked side: two long sweeps and a short curl.
  fig.capsule(hp([-1.0, 6.4, 6.4]), hp([-6.0, 9.0, 15.0]), 1.9, G.plume);
  fig.capsule(hp([-2.4, 5.0, 6.6]), hp([-9.6, 4.6, 12.6]), 1.7, G.plume);
  fig.sphere(hp([-6.2, 9.2, 15.2]), 2.1, G.plume);
  fig.sphere(hp([1.2, 6.8, 7.0]), 1.8, G.red);
}

/** One ostrich plume: a tapering sweep through `pts`, curling over at the tip. */
function plume(fig: Figure, pts: readonly V3[], r: number, mat: typeof G.plume): void {
  for (let k = 0; k + 1 < pts.length; k++) fig.cone(pts[k]!, pts[k + 1]!, r * (1 - 0.18 * k), r * (1 - 0.18 * (k + 1)), mat);
  fig.sphere(pts[pts.length - 1]!, r * 0.75, mat);
}

/**
 * The Landsknecht's great beret (M8): a huge flat cartwheel of slashed
 * two-tone cloth cocked over one ear, a crown of ostrich plumes — white
 * and red — curling over the brim all round. Far wider than the beret
 * the German crossbowman wears.
 */
export function grandBeret(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.sphere(hp([-0.3, 0, 1.6]), 6.6, M.team, { n: u, at: hp([0, 0, 1.4]) });
  const tilt: Axes = [rotate(f, l, 0.1), rotate(l, f, 0.26), rotate(u, f, 0.26)];
  fig.ellipsoid(hp([0.2, 1.8, 5.6]), tilt, [11.6, 12.6, 2.3], G.slashedWhite);
  fig.ellipsoid(hp([0.2, 1.6, 7.0]), tilt, [5.4, 5.8, 1.6], M.team);
  for (const [a, mat] of [[0.5, G.plume], [1.3, G.red], [2.1, G.plume], [2.9, G.red], [-0.3, G.plume]] as const) {
    const d = norm(add(scale(f, Math.cos(a)), scale(l, Math.sin(a))));
    const base = madd(hp([0.2, 1.6, 7.4]), d, 2.0);
    plume(fig, [base, madd(madd(base, d, 4.2), u, 4.6), madd(madd(base, d, 8.6), u, 4.4), madd(madd(base, d, 10.6), u, 1.4)], 2.3, mat);
  }
}

/** Katzbalger: the short broad sword with its S-shaped guard, worn across the left hip in a black scabbard. */
const katzbalger: BackItemPainter = (fig, torso) => {
  const hilt = torso([1.4, 6.6, 3.4]);
  fig.capsule(hilt, torso([-3.4, 7.6, -6.4]), 1.0, G.blackLeather);
  fig.capsule(hilt, torso([3.0, 6.3, 6.6]), 0.75, M.darkWood);
  fig.sphere(torso([3.2, 6.25, 7.0]), 1.15, M.steel);
  fig.capsule(torso([1.0, 4.4, 3.4]), torso([2.8, 4.2, 5.4]), 0.5, M.steel);
  fig.capsule(torso([1.8, 8.8, 3.6]), torso([0.0, 9.0, 1.4]), 0.5, M.steel);
  fig.capsule(torso([1.0, 4.4, 3.4]), torso([1.8, 8.8, 3.6]), 0.55, M.steel);
};

/** Pot helm (Topfhelm) under the buffalo-horn crest of German heraldry, the horns in team colour. */
export function hornedHelm(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.cone(hp([0, 0, -6.2]), hp([0, 0, 5.4]), 6.8, 6.4, M.steel);
  fig.sphere(hp([0, 0, 4.6]), 6.3, M.steel, { n: u, at: hp([0, 0, 5.0]) });
  fig.box(hp([6.45, 0, 1.0]), axes, [0.7, 4.9, 0.6], M.black);
  fig.box(hp([6.5, 0, -2.6]), axes, [0.4, 0.5, 2.6], M.gold);
  // Horns: three segments curving out and up from the crown, gilt tips.
  for (const s of [1, -1]) {
    const pts: V3[] = [hp([-0.6, s * 3.0, 8.4]), hp([-0.4, s * 7.2, 11.2]), hp([-0.8, s * 9.2, 15.8]), hp([-1.4, s * 8.6, 20.0])];
    const r = [2.0, 1.6, 1.15];
    for (let k = 0; k < 3; k++) fig.cone(pts[k]!, pts[k + 1]!, r[k]!, r[k + 1] ?? 0.6, M.team);
    fig.sphere(pts[3]!, 0.75, M.gold);
  }
  fig.ellipsoid(hp([-0.6, 0, 8.6]), [f, l, u], [3.0, 3.6, 1.6], M.team);
}

/** Spiked helm (Pickelhaube): a black leather dome, front and neck peaks, a brass front plate and a tall brass spike. */
export function pickelhaube(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.sphere(hp([-0.3, 0, 1.6]), 6.95, G.blackLeather, { n: u, at: hp([0, 0, 0.6]) });
  fig.box(hp([5.8, 0, 1.0]), [rotate(f, l, 0.32), l, rotate(u, l, 0.32)], [2.3, 4.6, 0.4], G.blackLeather);
  fig.box(hp([-6.0, 0, 0.6]), [rotate(f, l, -0.4), l, rotate(u, l, -0.4)], [1.8, 4.8, 0.4], G.blackLeather);
  fig.ellipsoid(hp([5.6, 0, 3.8]), axes, [0.6, 2.6, 2.4], M.brass);
  fig.sphere(hp([-0.3, 0, 7.6]), 2.3, M.brass);
  fig.cone(hp([-0.3, 0, 8.0]), hp([-0.5, 0, 19.0]), 2.1, 0.2, M.brass);
}

/** Shield on the left forearm, facing forward-left of the torso (baseGear's frame). */
function shieldFrame(hand: V3, T: Xform, lift: number): { face: V3; axes: Axes; c: V3 } {
  const face = norm(rotate(T.x, T.z, 0.42));
  const axes = axesAlong(face, T.y);
  return { face, axes, c: madd(madd(hand, face, 2.0), T.z, lift) };
}

/** Oval Germanic board shield: a big team-painted oval in a board rim, a domed iron boss. */
export function boardShield(fig: Figure, hand: V3, T: Xform): void {
  const { face, axes, c } = shieldFrame(hand, T, 1.2);
  fig.ellipsoid(madd(c, face, -0.4), axes, [0.8, 9.1, 11.8], G.board);
  fig.ellipsoid(c, axes, [1.1, 8.4, 11.1], M.team);
  fig.sphere(madd(c, face, 1.0), 2.7, M.iron);
  fig.sphere(madd(c, face, 3.0), 1.05, M.steel);
}

/** Heater shield: the black eagle displayed on a gold field inside a team rim. */
export function eagleShield(fig: Figure, hand: V3, T: Xform): void {
  const { face, axes, c } = shieldFrame(hand, T, 2.5);
  const clip = { n: scale(T.z, -1), at: madd(c, T.z, 4.6) };
  fig.ellipsoid(c, axes, [1.3, 6.2, 8.2], G.eagleShield, clip);
  const [, across, up] = axes;
  const e = (a: number, b: number, d = 1.55): V3 => madd(madd(madd(c, face, d), across, a), up, b);
  fig.ellipsoid(e(0, -0.4), axes, [0.45, 1.1, 2.6], G.eagle);
  fig.sphere(e(0.5, 2.6), 0.95, G.eagle);
  for (const s of [1, -1]) {
    const wing = norm(add(scale(across, s), scale(up, 0.55)));
    fig.box(e(s * 2.3, 0.6, 1.45), axesAlong(face, wing), [0.35, 2.1, 0.75], G.eagle);
    fig.box(e(s * 1.2, -3.2, 1.4), axesAlong(face, norm(add(scale(across, s * 0.4), scale(up, -1)))), [0.35, 1.2, 0.45], G.eagle);
  }
}

export const GERMAN_HATS = {
  spangenhelm: { draw: spangenhelm, coversHead: false },
  landsknecht: { draw: landsknechtBeret, coversHead: false },
  hornedHelm: { draw: hornedHelm, coversHead: true },
  pickelhaube: { draw: pickelhaube, coversHead: false },
  grandBeret: { draw: grandBeret, coversHead: false },
} satisfies Record<string, HatDef>;

export const GERMAN_BACK_ITEMS = { katzbalger } satisfies Record<string, BackItemPainter>;

export const GERMAN_SHIELDS = { boardShield, eagle: eagleShield } satisfies Record<string, ShieldPainter>;
