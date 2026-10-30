import { axesAlong, type Axes, type Figure } from '../figure';
import type { BackItemPainter, HatDef, ShieldPainter } from '../gear';
import { M, type Material } from '../materials';
import { add, madd, norm, rotate, scale, type V3, type Xform } from '../rigMath';
import { ITALIAN_M } from './italianMaterials';

const I = ITALIAN_M;

/*
 * Italian headgear, shield and pavise (M5): one silhouette cue per age —
 * the Samnite bronze helm with its three tall white feathers (Roman
 * Italy), the Venetian barbute, a deep steel bell with a T-shaped face
 * opening, and the tall Genoese pavise slung on the crossbowman's back
 * (the communes), and the wide-brimmed hat with a cascade of dark cock
 * feathers over its side (the Enlightenment's light infantry). The
 * knight's shield and the pavise bear the tricolour pales, outlined
 * dark. The legionary (M8) wears the Imperial galea with its transverse
 * crest and the cingulum's studded apron, and carries the great curved
 * scutum bearing the winged thunderbolt. Registered in gearRegistry.ts.
 */

/** Head-local point: hc + f·p0 + l·p1 + u·p2. */
const at = (hc: V3, [f, l, u]: Axes, p: V3): V3 => madd(madd(madd(hc, f, p[0]), l, p[1]), u, p[2]);

/** One feather: a tapering quill from `a` through a bend to its tip. */
function feather(fig: Figure, a: V3, mid: V3, tip: V3, r: number, mat: Material): void {
  fig.cone(a, mid, r * 0.7, r, mat);
  fig.cone(mid, tip, r, 0.35, mat);
}

/** Samnite helm: a bronze bowl with a brow peak and cheek guards, two tall white feathers at the sides and a taller one on the crown. */
export function samniteHelm(fig: Figure, hc: V3, axes: Axes): void {
  const [f, , u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.sphere(hp([-0.3, 0, 1.0]), 6.95, I.bronze, { n: norm(add(u, scale(f, 0.45))), at: hp([0, 0, -0.5]) });
  fig.cone(hp([-0.3, 0, -0.3]), hp([-0.3, 0, 0.9]), 7.2, 7.05, M.brass);
  fig.box(hp([6.3, 0, 1.2]), axes, [1.4, 4.6, 0.45], I.bronze);
  for (const s of [1, -1]) fig.box(hp([2.2, s * 5.8, -2.5]), axes, [2.2, 0.55, 3.0], I.bronze);
  // Feather holders at the temples and the three feathers, leaning out and back.
  for (const s of [1, -1]) {
    fig.capsule(hp([-0.6, s * 5.6, 3.6]), hp([-0.8, s * 6.2, 6.2]), 0.7, M.brass);
    feather(fig, hp([-0.8, s * 6.2, 6.0]), hp([-1.6, s * 7.4, 12.0]), hp([-3.4, s * 8.2, 17.4]), 1.45, I.feather);
  }
  feather(fig, hp([-0.6, 0, 7.4]), hp([-1.8, 0, 14.4]), hp([-4.4, 0, 20.4]), 1.6, I.feather);
}

/** Barbute: a deep steel bell over head and nape, a ridge to a point on the crown, a T-shaped face opening. */
export function barbute(fig: Figure, hc: V3, axes: Axes): void {
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.ellipsoid(hp([-0.4, 0, 0.2]), axes, [7.3, 7.1, 8.0], M.steel);
  fig.cone(hp([-0.6, 0, -4.0]), hp([-0.9, 0, -8.6]), 7.0, 7.9, M.steel);
  // The ridge, drawn up into a low point on the crown.
  fig.capsule(hp([5.4, 0, 4.4]), hp([-6.2, 0, 4.0]), 0.8, M.darkSteel);
  fig.cone(hp([-0.4, 0, 6.8]), hp([-0.6, 0, 10.0]), 2.6, 0.3, M.steel);
  // T opening: the eye slot across, the mouth slot down.
  fig.box(hp([6.7, 0, 1.0]), axes, [0.5, 3.8, 0.85], M.black);
  fig.box(hp([6.9, 0, -2.6]), axes, [0.5, 1.15, 3.0], M.black);
}

/** Wide-brimmed felt hat, its brim dipped to the right, a cascade of dark cock feathers spilling over that side. */
export function cappello(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.sphere(hp([-0.3, 0, 1.4]), 6.8, I.felt, { n: u, at: hp([0, 0, 1.0]) });
  fig.cone(hp([-0.3, 0, 2.4]), hp([-0.3, 0, 7.0]), 6.2, 5.2, I.felt);
  const tilt: Axes = [f, rotate(l, f, -0.18), rotate(u, f, -0.18)];
  fig.ellipsoid(hp([0, -0.6, 2.6]), tilt, [12.4, 12.4, 0.75], I.felt);
  fig.cone(hp([-0.3, 0, 2.8]), hp([-0.3, 0, 3.9]), 6.3, 6.1, M.black);
  // The plume: rooted on the right of the crown, spilling down past the brim.
  const root = hp([0.4, -4.6, 6.6]);
  for (const [df, dl, du, r] of [[-1.0, -6.0, 3.2, 2.2], [-3.4, -8.4, 1.2, 2.4], [-5.6, -10.4, -2.6, 2.1], [0.8, -9.4, -1.0, 1.9], [-2.0, -11.6, -4.4, 1.7]] as const) {
    const tip = hp([0.4 + df, -4.6 + dl, 6.6 + du]);
    fig.cone(root, tip, 1.4, r, I.plume);
    fig.sphere(tip, r * 0.9, I.plume);
  }
}

/** Shield on the left forearm, facing forward-left of the torso (baseGear's frame). */
function shieldFrame(hand: V3, T: Xform, lift: number): { face: V3; axes: Axes; c: V3 } {
  const face = norm(rotate(T.x, T.z, 0.42));
  const axes = axesAlong(face, T.y);
  return { face, axes, c: madd(madd(hand, face, 2.0), T.z, lift) };
}

/**
 * The tricolour pales on a face: a dark outline panel first, then the
 * green, white and red pales just in front. `e(a, b, d)` maps across a,
 * up b, d out of the face to rig space; `flat` are the face's axes.
 */
function pales(fig: Figure, e: (a: number, b: number, d: number) => V3, flat: Axes, d: number, w: number, h: number): void {
  fig.box(e(0, 0, d - 0.3), flat, [0.25, w * 1.5 + 0.55, h + 0.55], I.paleEdge);
  ([I.paleGreen, I.paleWhite, I.paleRed] as const).forEach((mat, k) => fig.box(e((k - 1) * w, 0, d), flat, [0.25, w / 2, h], mat));
}

/** Heater shield: the tricolour pales, outlined dark, on the team field. */
export function tricoloreShield(fig: Figure, hand: V3, T: Xform): void {
  const { face, axes, c } = shieldFrame(hand, T, 2.5);
  const clip = { n: scale(T.z, -1), at: madd(c, T.z, 4.4) };
  fig.ellipsoid(c, axes, [1.3, 6.0, 8.0], M.team, clip);
  const [, across, up] = axes;
  const e = (a: number, b: number, d: number): V3 => madd(madd(madd(c, face, d), across, a), up, b);
  pales(fig, (a, b, d) => e(a, b - 0.4, d), axesAlong(face, across), 1.5, 2.0, 3.8);
}

/**
 * Genoese pavise slung on the back: a tall board shield, its team face
 * outward with the tricolour pales down the middle, a poplar back and
 * a leather rim.
 */
export const pavise: BackItemPainter = (fig, at, T) => {
  const tAxes: Axes = [T.x, T.y, T.z];
  fig.box(at([-5.6, 0, 10.4]), tAxes, [0.6, 7.9, 12.8], I.board);
  fig.box(at([-6.3, 0, 10.4]), tAxes, [0.35, 7.3, 12.2], M.team);
  const back: V3 = scale(T.x, -1);
  const e = (a: number, b: number, d: number): V3 => madd(madd(madd(at([-6.3, 0, 11.4]), back, d), T.y, a), T.z, b);
  pales(fig, e, axesAlong(back, T.y), 0.7, 2.3, 6.6);
};

/**
 * Imperial galea (M8): a steel bowl with a brass brow band and a
 * forehead ridge, a broad neck guard sloping out over the nape, hinged
 * cheek pieces, and a tall team-coloured crest worn athwart, from ear to
 * ear (the centurion's), standing on a brass holder.
 */
export function transverseGalea(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  // Neck guard first: a broad flat lip out over the nape.
  const nape: Axes = [rotate(f, l, 0.45), l, rotate(u, l, 0.45)];
  fig.ellipsoid(hp([-5.6, 0, -1.6]), nape, [3.6, 7.6, 0.9], M.steel);
  fig.sphere(hp([-0.3, 0, 0.9]), 6.95, M.steel, { n: norm(add(u, scale(f, 0.5))), at: hp([0, 0, -0.4]) });
  fig.cone(hp([-0.3, 0, 0.2]), hp([-0.3, 0, 1.3]), 7.2, 7.05, M.brass);
  fig.box(hp([6.2, 0, 3.0]), axes, [0.6, 4.4, 0.45], M.brass);
  for (const s of [1, -1]) {
    fig.box(hp([2.4, s * 5.8, -2.6]), axes, [2.4, 0.6, 3.3], M.steel);
    fig.sphere(hp([2.4, s * 6.4, -2.4]), 0.55, M.brass);
  }
  // The crest: a half-disc athwart the crown, on a brass holder.
  fig.capsule(hp([-0.4, 4.6, 6.6]), hp([-0.4, -4.6, 6.6]), 0.8, M.brass);
  fig.ellipsoid(hp([-0.4, 0, 6.6]), axes, [1.8, 10.2, 7.4], M.team, { n: u, at: hp([0, 0, 6.8]) });
  fig.ellipsoid(hp([-0.4, 0, 6.6]), axes, [1.4, 10.6, 0.9], M.brass);
}

/**
 * Legionary's scutum (M8): a tall rectangle curved round the body, its
 * board covered in team-dyed leather front and back, a round brass boss, and the winged
 * thunderbolt of the legions raised on it in gold — a zig-zag bolt
 * through the boss and a spread wing to each side — over a slightly
 * larger dark copy so it reads on a yellow team.
 */
export function legionScutum(fig: Figure, hand: V3, T: Xform): void {
  const { face, axes, c } = shieldFrame(hand, T, 1.4);
  const [, across, up] = axes;
  const H = 12.0;
  // Three curved panels, the centre and the two wings bent back round the body; a deeper
  // backing behind each gives the board its edge (the covering is team leather all round).
  const panels: Array<[number, number]> = [[-1, -0.55], [0, 0], [1, -0.55]];
  for (const [s, bend] of panels) {
    const dirAcross = norm(add(across, scale(face, s * bend * 0.8)));
    const pc = madd(madd(c, across, s * 5.4), face, -Math.abs(s) * 1.5);
    const pa = axesAlong(norm(add(face, scale(across, -s * 0.5))), dirAcross);
    fig.box(pc, s === 0 ? axes : [pa[0], dirAcross, up], [0.8, s === 0 ? 3.2 : 2.6, H], M.team);
    fig.box(madd(pc, face, -0.3), s === 0 ? axes : [pa[0], dirAcross, up], [0.6, s === 0 ? 3.3 : 2.8, H + 0.5], M.team);
  }
  // Emblem-local point: across a, up b, d in front of the centre panel.
  const e = (a: number, b: number, d: number): V3 => madd(madd(madd(c, face, d), across, a), up, b);
  const bent = (a: number, b: number, d: number): V3 => madd(e(a, b, d), face, -Math.max(0, Math.abs(a) - 3.0) * 0.55);
  for (const [mat, d, g] of [[I.boltEdge, 0.9, 0.35], [I.bolt, 1.35, 0]] as const) {
    // The bolt: a zig-zag from top to bottom through the boss.
    const zig: Array<[number, number]> = [[0.6, 8.8], [-1.2, 4.6], [1.0, 2.2], [-1.0, -2.2], [1.2, -4.6], [-0.6, -8.8]];
    for (let k = 0; k < zig.length - 1; k++) fig.capsule(e(zig[k]![0], zig[k]![1], d), e(zig[k + 1]![0], zig[k + 1]![1], d), 0.65 + g, mat);
    // The wings: three feathers each side, spread up and out from the boss.
    for (const s of [1, -1]) {
      for (const [ea, eb, r] of [[7.0, 5.2, 0.9], [7.4, 2.4, 0.8], [6.8, -0.2, 0.7]] as const) {
        fig.capsule(bent(s * 2.2, 0.8, d), bent(s * ea, eb, d), r + g, mat);
      }
    }
  }
  fig.sphere(madd(c, face, 1.2), 2.2, M.brass);
}

/** Cingulum (M8): a brass-studded belt with its apron of four studded leather straps hanging at the front. */
export const cingulum: BackItemPainter = (fig, at) => {
  for (const y of [-1.8, -0.6, 0.6, 1.8]) {
    fig.capsule(at([4.9, y, 3.0]), at([5.5, y * 1.05, -4.6]), 0.42, M.darkLeather);
    for (const z of [1.2, -1.2, -3.6]) fig.sphere(at([5.2 + (3.0 - z) * 0.03, y, z]), 0.45, M.brass);
  }
};

export const ITALIAN_HATS = {
  samniteHelm: { draw: samniteHelm, coversHead: false },
  barbute: { draw: barbute, coversHead: true },
  cappello: { draw: cappello, coversHead: false },
  transverseGalea: { draw: transverseGalea, coversHead: false },
} satisfies Record<string, HatDef>;

export const ITALIAN_SHIELDS = { tricoloreShield, legionScutum } satisfies Record<string, ShieldPainter>;

export const ITALIAN_BACK_ITEMS = { pavise, cingulum } satisfies Record<string, BackItemPainter>;
