import { axesAlong, type Axes, type Figure } from '../figure';
import type { HatDef, ShieldPainter, WeaponStyleDef } from '../gear';
import { M } from '../materials';
import { add, madd, norm, rotate, scale, type V3, type Xform } from '../rigMath';
import { SPANISH_M } from './spanishMaterials';

const S = SPANISH_M;

/*
 * Spanish headgear, shields and the falcata (M5): one silhouette cue per
 * age — the Iberian warrior's small round caetra and forward-curved
 * falcata under a crested bronze helm (Hispania), the heart-shaped
 * leather adarga of the jinetes and the Castilian infantry, bearing the
 * castle of Castile (Reconquista), the crested morion with its upturned
 * boat-shaped brim and the tercio's broad-brimmed chambergo with its
 * plume (Siglo de las Luces reaching back to the tercios). Registered in
 * gearRegistry.ts.
 */

/** Head-local point: hc + f·p0 + l·p1 + u·p2. */
const at = (hc: V3, [f, l, u]: Axes, p: V3): V3 => madd(madd(madd(hc, f, p[0]), l, p[1]), u, p[2]);

/** Iberian helm: a bronze bowl with a knob finial, cheek pieces and a dark red horsehair crest falling back. */
export function iberianHelm(fig: Figure, hc: V3, axes: Axes): void {
  const [f, , u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.sphere(hp([-0.3, 0, 1.0]), 6.95, S.bronze, { n: norm(add(u, scale(f, 0.45))), at: hp([0, 0, -0.5]) });
  fig.cone(hp([-0.3, 0, -0.3]), hp([-0.3, 0, 0.9]), 7.2, 7.05, M.brass);
  for (const s of [1, -1]) fig.box(hp([2.2, s * 5.8, -2.5]), axes, [2.2, 0.55, 3.0], S.bronze);
  fig.sphere(hp([-0.4, 0, 7.6]), 1.6, S.bronze);
  // The crest: from the knob up, then back and down over the nape.
  const pts: V3[] = [hp([-0.4, 0, 8.6]), hp([-3.6, 0, 11.6]), hp([-7.6, 0, 9.4]), hp([-9.4, 0, 3.6])];
  const r = [1.8, 2.3, 2.0, 1.2];
  for (let k = 0; k < 3; k++) fig.cone(pts[k]!, pts[k + 1]!, r[k]!, r[k + 1]!, S.horsehair);
}

/** Crested morion: a steel bowl under a tall comb, the brim drawn up into points front and back (a boat), brass rivets. */
export function morion(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.ellipsoid(hp([-0.3, 0, 2.2]), axes, [7.4, 6.9, 6.2], M.steel, { n: u, at: hp([0, 0, 0.2]) });
  // Brim: a flat ring under the bowl, its ends swept up into the two points.
  fig.ellipsoid(hp([-0.3, 0, 0.4]), axes, [10.6, 8.0, 0.9], M.steel);
  for (const s of [1, -1]) fig.cone(hp([s * 8.4 - 0.3, 0, 0.6]), hp([s * 12.2 - 0.3, 0, 4.6]), 2.4, 0.4, M.steel);
  // The comb: a tall thin crescent along the crown, front to back.
  fig.ellipsoid(hp([-0.3, 0, 8.4]), [f, l, u], [6.4, 0.75, 5.0], M.steel, { n: scale(u, -1), at: hp([0, 0, 6.2]) });
  fig.capsule(hp([5.6, 0, 8.6]), hp([-6.2, 0, 8.6]), 0.4, M.darkSteel);
  for (const k of [-4, 0, 4]) fig.sphere(hp([k * 0.9 - 0.3, k === 0 ? 6.9 : 6.4, 1.6]), 0.55, M.brass);
}

/** Chambergo: a black felt hat with a broad brim pinned up on the left, a gold band and a cream plume sweeping back. */
export function chambergo(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.sphere(hp([-0.3, 0, 1.4]), 6.8, S.felt, { n: u, at: hp([0, 0, 1.0]) });
  fig.cone(hp([-0.3, 0, 2.6]), hp([-0.3, 0, 8.2]), 6.0, 5.2, S.felt);
  fig.cone(hp([-0.3, 0, 2.8]), hp([-0.3, 0, 4.0]), 6.15, 6.0, M.gold);
  // The brim, tilted up on the left side where it is pinned to the crown.
  const tilt: Axes = [f, rotate(l, f, 0.32), rotate(u, f, 0.32)];
  fig.ellipsoid(hp([0.2, 0.8, 2.8]), tilt, [11.4, 11.0, 0.8], S.felt);
  fig.sphere(hp([0.8, 7.4, 6.0]), 1.3, M.gold);
  fig.capsule(hp([-0.6, 6.0, 6.6]), hp([-6.4, 7.6, 12.6]), 2.1, S.plume);
  fig.capsule(hp([-6.4, 7.6, 12.6]), hp([-10.8, 5.4, 9.8]), 1.6, S.plume);
}

/** Shield on the left forearm, facing forward-left of the torso (baseGear's frame). */
function shieldFrame(hand: V3, T: Xform, lift: number): { face: V3; axes: Axes; c: V3 } {
  const face = norm(rotate(T.x, T.z, 0.42));
  const axes = axesAlong(face, T.y);
  return { face, axes, c: madd(madd(hand, face, 2.0), T.z, lift) };
}

/** Caetra: a small round Iberian shield, a team face in a bronze-studded rim, a big domed boss. */
export function caetra(fig: Figure, hand: V3, T: Xform): void {
  const { face, axes, c } = shieldFrame(hand, T, 1.4);
  fig.ellipsoid(madd(c, face, -0.4), axes, [0.9, 7.0, 7.0], S.hide);
  fig.ellipsoid(c, axes, [1.2, 6.4, 6.4], M.team);
  const [, across, up] = axes;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    fig.sphere(madd(madd(madd(c, face, 0.7), across, 5.5 * Math.cos(a)), up, 5.5 * Math.sin(a)), 0.6, S.bronze);
  }
  fig.sphere(madd(c, face, 1.0), 2.4, S.bronze);
  fig.sphere(madd(c, face, 2.6), 0.9, M.brass);
}

/**
 * Adarga: the heart-shaped leather shield of the jinetes — two lobes
 * side by side over a point, a team face in a dark hide rim — bearing
 * the gold castle of Castile, outlined dark so it reads on any team.
 */
export function adarga(fig: Figure, hand: V3, T: Xform): void {
  const { face, axes, c } = shieldFrame(hand, T, 2.2);
  const [, across, up] = axes;
  const lobe = (s: number, d: number): V3 => madd(madd(madd(c, face, d), across, s * 3.2), up, 1.4);
  for (const s of [1, -1]) fig.ellipsoid(lobe(s, -0.4), axes, [0.9, 5.0, 6.6], S.hide);
  fig.cone(madd(madd(c, face, -0.4), up, -2.0), madd(madd(c, face, -0.4), up, -8.8), 5.6, 0.6, S.hide);
  for (const s of [1, -1]) fig.ellipsoid(lobe(s, 0), axes, [1.2, 4.5, 6.0], M.team);
  fig.cone(madd(c, up, -2.0), madd(c, up, -8.0), 5.0, 0.4, M.team);
  // Castle-local point: across a, up b, d in front of the shield's centre.
  const e = (a: number, b: number, d: number): V3 => madd(madd(madd(c, face, d), across, a), up, b);
  const flat = axesAlong(face, across);
  // The dark outline copy first, a touch larger and just behind, then the gold.
  for (const [mat, d, g] of [[S.castleEdge, 1.25, 0.45], [S.castle, 1.75, 0]] as const) {
    fig.box(e(0, -0.8, d), flat, [0.3, 3.2 + g, 1.6 + g], mat);
    fig.box(e(0, 1.8, d), flat, [0.3, 1.1 + g, 1.6 + g], mat);
    for (const s of [1, -1]) fig.box(e(s * 2.3, 1.0, d), flat, [0.3, 0.9 + g, 1.4 + g], mat);
  }
  fig.box(e(0, -1.6, 2.05), flat, [0.2, 0.7, 0.9], S.castleGate);
}

/** Falcata: a forward-curved single-edged blade swelling towards the point, the hilt closed by a hooked guard. */
function falcata(fig: Figure, at: (k: number) => V3, d: V3, side: V3): void {
  fig.capsule(at(-1.8), at(1.4), 0.85, M.darkWood);
  fig.capsule(at(-2.0), madd(at(-3.4), side, -1.8), 0.7, M.steel);
  fig.capsule(madd(at(-3.4), side, -1.8), madd(at(1.6), side, -1.9), 0.4, M.steel);
  let p = at(1.8);
  for (const [len, bend, r] of [[4, -0.5, 0.9], [4.5, -0.2, 1.3], [4, 0.9, 1.45], [2.6, 1.3, 0.9]] as const) {
    const q = madd(madd(p, d, len), side, bend);
    fig.capsule(p, q, r, M.steel);
    p = q;
  }
  fig.cone(p, madd(p, side, 1.4), 0.8, 0.05, M.steel);
}

export const SPANISH_HATS = {
  iberianHelm: { draw: iberianHelm, coversHead: false },
  morion: { draw: morion, coversHead: false },
  chambergo: { draw: chambergo, coversHead: false },
} satisfies Record<string, HatDef>;

export const SPANISH_SHIELDS = { caetra, adarga } satisfies Record<string, ShieldPainter>;

export const SPANISH_WEAPON_STYLES = {
  falcata: { kind: 'gladius', draw: (fig, w, d, side) => falcata(fig, (k) => madd(w.at, d, k), d, side) },
} satisfies Record<string, WeaponStyleDef>;
