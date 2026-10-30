import { axesAlong, type Axes, type Figure } from '../figure';
import type { BackItemPainter, HatDef, ShieldPainter } from '../gear';
import { M } from '../materials';
import { add, madd, norm, rotate, scale, type V3, type Xform } from '../rigMath';
import { FRENCH_M } from './frenchMaterials';

const F = FRENCH_M;

/*
 * French headgear and shields (M5): one silhouette cue per age — the
 * Gaulish warrior's bronze helm under a spoked wheel crest and his long
 * narrow body shield with its wooden spine (Gaule), the pointed
 * "hounskull" bascinet with its snouted visor (Moyen Âge), the bicorne
 * worn athwart and the cuirassier's crested helm with its long black
 * horsehair mane (Lumières). The knight's heater shield bears a gold
 * fleur-de-lis on the team field. The King's Musketeer (M8) wears the
 * plumed cavalier hat, the casaque's cross and the bandolier. Registered in gearRegistry.ts.
 */

/** Head-local point: hc + f·p0 + l·p1 + u·p2. */
const at = (hc: V3, [f, l, u]: Axes, p: V3): V3 => madd(madd(madd(hc, f, p[0]), l, p[1]), u, p[2]);

/** Gaulish helm: a bronze bowl with cheek guards and a spoked wheel crest standing front to back on the crown. */
export function wheelHelm(fig: Figure, hc: V3, axes: Axes): void {
  const [f, , u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.sphere(hp([-0.3, 0, 1.0]), 6.95, F.bronze, { n: norm(add(u, scale(f, 0.4))), at: hp([0, 0, -0.6]) });
  fig.cone(hp([-0.3, 0, -0.2]), hp([-0.3, 0, 1.0]), 7.2, 7.05, M.brass);
  for (const s of [1, -1]) fig.box(hp([2.0, s * 5.8, -2.6]), axes, [2.4, 0.55, 3.2], F.bronze);
  // Stem, then the wheel: a rim of eight segments and four spokes in the crown's front-back plane.
  fig.capsule(hp([-0.3, 0, 6.6]), hp([-0.3, 0, 9.4]), 0.9, F.bronze);
  const c = hp([-0.3, 0, 13.6]);
  const R = 4.3;
  const rim = (k: number): V3 => madd(madd(c, f, R * Math.cos((k * Math.PI) / 4)), u, R * Math.sin((k * Math.PI) / 4));
  for (let k = 0; k < 8; k++) fig.capsule(rim(k), rim(k + 1), 0.8, F.bronze);
  for (let k = 0; k < 4; k++) fig.capsule(rim(k), rim(k + 4), 0.45, F.bronze);
  fig.sphere(c, 1.1, M.brass);
}

/** Pointed bascinet with the snouted "hounskull" visor and a mail aventail over the shoulders. */
export function hounskull(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.ellipsoid(hp([-0.4, 0, -6.4]), axes, [6.4, 7.8, 3.2], M.mail);
  fig.sphere(hp([-0.6, 0, 0.8]), 7.0, M.steel);
  // The bowl draws up into a point leaning back.
  fig.cone(hp([-1.0, 0, 3.4]), hp([-3.4, 0, 14.0]), 5.9, 0.3, M.steel);
  // Visor: a snout drawn forward to a blunt point, breaths along its sides, a sight slit above.
  const snout = rotate(f, l, -0.08);
  fig.cone(hp([2.6, 0, 0.6]), madd(hp([2.6, 0, 0.6]), snout, 9.6), 5.4, 0.7, M.steel);
  fig.box(hp([5.6, 0, 2.9]), [f, l, u], [0.5, 4.2, 0.45], M.black);
  for (const s of [1, -1]) fig.sphere(hp([7.0, s * 2.3, -0.4]), 0.55, M.black);
  fig.capsule(hp([3.4, 4.8, 0.8]), hp([3.4, -4.8, 0.8]), 0.55, M.brass);
}

/** Bicorne worn athwart: a black felt crescent across the head, gilt lace on its edge, a white cockade. */
export function bicorne(fig: Figure, hc: V3, axes: Axes): void {
  const [, , u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.sphere(hp([-0.4, 0, 1.2]), 6.75, F.felt, { n: u, at: hp([0, 0, 1.0]) });
  // The crescent: a tall flattened half-oval across the head, its horns drawn out at the sides.
  fig.ellipsoid(hp([-0.6, 0, 4.0]), axes, [2.6, 10.0, 8.6], F.felt, { n: scale(u, -1), at: hp([0, 0, 4.0]) });
  for (const s of [1, -1]) fig.cone(hp([-0.6, s * 7.6, 4.6]), hp([-0.6, s * 12.4, 6.4]), 2.0, 0.4, F.felt);
  // Gilt lace along the upper edge, the cockade and its loop at the front.
  for (let k = 0; k < 6; k++) {
    const a0 = (k / 6) * Math.PI;
    const a1 = ((k + 1) / 6) * Math.PI;
    const edge = (a: number): V3 => hp([0.9, 10.0 * Math.cos(a), 4.0 + 8.4 * Math.sin(a)]);
    fig.capsule(edge(a0), edge(a1), 0.5, M.gold);
  }
  fig.sphere(hp([2.0, 3.8, 8.2]), 1.9, F.white);
  fig.capsule(hp([2.1, 3.8, 9.8]), hp([2.1, 3.8, 5.0]), 0.45, M.gold);
}

/** Cuirassier's helm: a steel skull with a brass band and comb, a peak, and a long black horsehair mane down the back. */
export function crestedHelm(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.sphere(hp([-0.3, 0, 1.4]), 6.95, M.steel, { n: u, at: hp([0, 0, 0.4]) });
  fig.cone(hp([-0.3, 0, 0.4]), hp([-0.3, 0, 2.6]), 7.15, 7.0, M.brass);
  fig.box(hp([5.9, 0, 0.9]), [rotate(f, l, 0.3), l, rotate(u, l, 0.3)], [2.1, 4.6, 0.4], M.black);
  // Brass comb from brow to nape, a short white tuft at its front.
  fig.capsule(hp([4.2, 0, 7.4]), hp([-4.4, 0, 8.4]), 1.5, M.brass);
  fig.sphere(hp([4.6, 0, 8.6]), 1.6, F.white);
  // The mane: from the comb's top, back and down past the shoulders.
  const pts: V3[] = [hp([-0.4, 0, 9.8]), hp([-6.2, 0, 9.0]), hp([-9.6, 0, 3.2]), hp([-10.8, 0, -4.4]), hp([-10.6, 0, -10.0])];
  const r = [2.2, 2.4, 2.1, 1.6, 1.1];
  for (let k = 0; k < 4; k++) fig.cone(pts[k]!, pts[k + 1]!, r[k]!, r[k + 1]!, F.horsehair);
}

/** Shield on the left forearm, facing forward-left of the torso (baseGear's frame). */
function shieldFrame(hand: V3, T: Xform, lift: number): { face: V3; axes: Axes; c: V3 } {
  const face = norm(rotate(T.x, T.z, 0.42));
  const axes = axesAlong(face, T.y);
  return { face, axes, c: madd(madd(hand, face, 2.0), T.z, lift) };
}

/** Long Gaulish body shield: a tall, narrow team oval in a board rim, a wooden spine and a spindle boss. */
export function gaulShield(fig: Figure, hand: V3, T: Xform): void {
  const { face, axes, c } = shieldFrame(hand, T, 1.6);
  const [, , up] = axes;
  fig.ellipsoid(madd(c, face, -0.4), axes, [0.8, 6.3, 14.6], F.board);
  fig.ellipsoid(c, axes, [1.1, 5.7, 13.9], M.team);
  fig.capsule(madd(madd(c, face, 0.9), up, -11.6), madd(madd(c, face, 0.9), up, 11.6), 0.75, F.board);
  fig.ellipsoid(madd(c, face, 1.3), axes, [1.4, 3.0, 1.8], M.iron);
}

/** Heater shield: a gold fleur-de-lis on the team field. */
export function fleurShield(fig: Figure, hand: V3, T: Xform): void {
  const { face, axes, c } = shieldFrame(hand, T, 2.5);
  const clip = { n: scale(T.z, -1), at: madd(c, T.z, 4.6) };
  fig.ellipsoid(c, axes, [1.3, 6.2, 8.2], M.team, clip);
  const [, across, up] = axes;
  // Lily-local point: across a, up b, d in front of the shield's centre (the field's top is cut 4.6 above it).
  const e = (a: number, b: number, d = 1.7): V3 => madd(madd(madd(c, face, d), across, a), up, b);
  // Centre petal, the band, the side petals curling out and down, the foot: first a slightly
  // larger dark copy just behind (the outline that keeps the gold apart from a yellow team), then the gold.
  for (const [mat, d, grow] of [[F.lilyEdge, 1.2, 0.4], [F.lily, 1.7, 0]] as const) {
    fig.cone(e(0, -0.2 - grow, d), e(0, 4.0 + grow, d), 1.6 + grow, 0.2 + grow, mat);
    fig.box(e(0, -0.8, d - 0.1), axesAlong(face, across), [0.4, 2.4 + grow, 0.6 + grow], mat);
    for (const s of [1, -1]) {
      fig.capsule(e(s * 0.8, -0.3, d), e(s * 2.9, 2.2, d), 0.8 + grow, mat);
      fig.capsule(e(s * 2.9, 2.2, d), e(s * 3.6, -0.4, d), 0.7 + grow, mat);
    }
    fig.cone(e(0, -1.3, d), e(0, -4.6 - grow, d), 1.1 + grow, 0.25 + grow, mat);
  }
}

/**
 * Cavalier hat (M8): a broad flat felt brim with a gilt edge, its left
 * side turned up against a low crown, and a big white ostrich plume
 * rising from the turned-up side and sweeping over the crown and back.
 */
export function cavalier(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.sphere(hp([-0.4, 0, 1.4]), 6.75, F.felt, { n: u, at: hp([0, 0, 1.2]) });
  fig.cone(hp([-0.4, 0, 2.0]), hp([-0.5, 0, 6.4]), 6.7, 6.2, F.felt);
  fig.sphere(hp([-0.5, 0, 5.2]), 6.2, F.felt, { n: u, at: hp([0, 0, 6.2]) });
  fig.cone(hp([-0.4, 0, 2.6]), hp([-0.4, 0, 3.8]), 6.85, 6.8, M.gold);
  // Flat brim with a gilt edge; the left side turned up against the crown.
  const bc = hp([0, -0.8, 2.4]);
  fig.cone(bc, madd(bc, u, 0.6), 10.6, 10.4, F.felt);
  fig.cone(madd(bc, u, 0.05), madd(bc, u, 0.55), 11.0, 10.8, M.gold, { n: scale(l, -1), at: madd(bc, l, 4.0) });
  const up: Axes = [f, rotate(l, f, -1.15), rotate(u, f, -1.15)];
  const flap = hp([-0.4, 7.4, 6.0]);
  fig.ellipsoid(flap, up, [7.6, 0.7, 4.0], F.felt, { n: up[2], at: madd(flap, up[2], -0.4) });
  fig.capsule(madd(madd(flap, up[0], -6.6), up[2], 3.6), madd(madd(flap, up[0], 6.6), up[2], 3.6), 0.55, M.gold);
  fig.sphere(madd(flap, l, 0.8), 1.4, F.white);
  // The plume: rising from the turned-up side, sweeping over the crown and down the back.
  const pts: V3[] = [hp([2.4, 6.6, 7.0]), hp([0.6, 6.0, 12.6]), hp([-4.4, 3.2, 13.8]), hp([-9.6, 0.4, 10.6]), hp([-11.6, -1.4, 5.6])];
  const r = [3.0, 3.0, 2.7, 2.2];
  for (let k = 0; k < 4; k++) fig.cone(pts[k]!, pts[k + 1]!, r[k]!, r[k + 1] ?? 1.6, F.white);
  fig.sphere(pts[4]!, 1.7, F.white);
}

/**
 * Casaque gear (M8): the white cross of the King's Musketeers standing
 * proud of the team cloth front and back — thin discs through the
 * torso that only break its surface where the cross lies — then the
 * falling lace collar and a buff bandolier over the left shoulder with
 * its hanging powder charges.
 */
const casaque: BackItemPainter = (fig, torso, T) => {
  const axes: Axes = [T.x, T.y, T.z];
  fig.ellipsoid(torso([0, 0, 7.4]), axes, [5.0, 2.0, 7.8], F.cross);
  fig.ellipsoid(torso([0, 0, 9.2]), axes, [5.3, 5.6, 1.9], F.cross);
  fig.ellipsoid(torso([0.4, 0, 13.9]), axes, [3.4, 5.4, 0.9], F.white);
  fig.capsule(torso([3.0, 5.2, 12.8]), torso([4.4, -4.6, 2.6]), 0.75, F.buff);
  fig.capsule(torso([-3.2, 5.2, 12.8]), torso([-4.2, -4.6, 2.6]), 0.75, F.buff);
  for (const t of [0.62, 0.74, 0.86]) {
    const p = torso([3.0 + 1.4 * t + 0.6, 5.2 - 9.8 * t, 12.8 - 10.2 * t]);
    fig.capsule(p, madd(p, T.z, -2.0), 0.7, M.darkWood);
    fig.sphere(p, 0.5, M.brass);
  }
};

export const FRENCH_HATS = {
  wheelHelm: { draw: wheelHelm, coversHead: false },
  hounskull: { draw: hounskull, coversHead: true },
  bicorne: { draw: bicorne, coversHead: false },
  crestedHelm: { draw: crestedHelm, coversHead: false },
  cavalier: { draw: cavalier, coversHead: false },
} satisfies Record<string, HatDef>;

export const FRENCH_BACK_ITEMS = { casaque } satisfies Record<string, BackItemPainter>;

export const FRENCH_SHIELDS = { gaulShield, fleurShield } satisfies Record<string, ShieldPainter>;
