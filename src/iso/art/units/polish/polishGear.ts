import { axesAlong, type Axes, type Figure } from '../figure';
import type { BackItemPainter, HatDef, ShieldPainter } from '../gear';
import { M } from '../materials';
import { add, madd, norm, rotate, scale, type V3, type Xform } from '../rigMath';
import { POLISH_M } from './polishMaterials';

const P = POLISH_M;

/*
 * Polish headgear, shields and the hussar wings (M21): one silhouette
 * cue per age — the tall conical Slavic helm, gilt-ribbed, with a team
 * horsehair tuft at its point, and the big round shield in a studded
 * iron rim (Römerzeit); the kapalin, a ridged kettle hat with a wide,
 * down-swept brim, on the pikeman and the crossbowman, and the knight's
 * heater shield with the crowned white eagle (Középkor); the hussar
 * szyszak — a bright fluted skull with a gilt finial spike, a peak with
 * a sliding nasal, cheek pieces and a short laminated neck guard — on
 * the cavalry, and the hajduk's magierka, a team felt cap in a black
 * brim slit at the front, on the musketeer (Felvilágosodás). The winged
 * hussar (M21) wears the szyszak and the wings: two crimson frames set
 * with white feathers rising from his back plate high above his head.
 * Registered in gearRegistry.ts.
 */

/** Head-local point: hc + f·p0 + l·p1 + u·p2. */
const at = (hc: V3, [f, l, u]: Axes, p: V3): V3 => madd(madd(madd(hc, f, p[0]), l, p[1]), u, p[2]);

/** Slavic conical helm: a steel bowl drawn up into a tall cone, a gilt brow band and four gilt ribs, a team horsehair tuft at the point. */
export function slavHelm(fig: Figure, hc: V3, axes: Axes): void {
  const [, , u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.sphere(hp([-0.2, 0, 1.0]), 6.95, M.steel, { n: u, at: hp([0, 0, 0.6]) });
  fig.cone(hp([-0.2, 0, 3.4]), hp([-0.6, 0, 14.0]), 6.2, 0.5, M.steel);
  for (const [df, dl] of [[1, 0], [0, 1], [0, -1], [-1, 0]] as const) {
    fig.capsule(hp([-0.2 + df * 6.6, dl * 6.6, 1.4]), hp([-0.5 + df * 0.8, dl * 0.8, 12.6]), 0.42, M.brass);
  }
  fig.cone(hp([-0.2, 0, 0.2]), hp([-0.2, 0, 2.2]), 7.2, 7.1, M.brass);
  // The tuft: a team horsehair plume from the point, falling back.
  fig.sphere(hp([-0.7, 0, 14.4]), 1.5, M.team);
  fig.capsule(hp([-1.2, 0, 14.6]), hp([-5.2, 0, 10.4]), 1.5, M.team);
  fig.capsule(hp([-5.2, 0, 10.4]), hp([-7.4, 0, 4.6]), 1.1, M.team);
}

/** Kapalin: a ridged steel kettle hat, its wide brim swept down all round, a gilt edge on the brim. */
export function kapalin(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  // The brim first: a shallow cone, wide at its lower edge.
  fig.cone(hp([0, 0, 3.6]), hp([0, 0, 0.6]), 7.4, 11.6, M.darkSteel);
  fig.cone(hp([0, 0, 0.9]), hp([0, 0, 0.3]), 11.2, 11.9, M.brass);
  fig.sphere(hp([0, 0, 2.6]), 6.9, M.steel, { n: u, at: hp([0, 0, 2.8]) });
  // The comb along the crown, front to back.
  fig.box(hp([0, 0, 8.6]), [f, l, u], [5.2, 0.6, 1.6], M.steel, { n: scale(u, -1), at: hp([0, 0, 7.0]) });
  fig.sphere(hp([0, 0, 9.4]), 0.9, M.brass);
}

/**
 * Szyszak: a bright fluted steel skull with a gilt finial spike, a fixed
 * peak with a sliding nasal ending in a leaf, cheek pieces, and a short
 * neck guard of two lames.
 */
export function szyszak(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  for (let k = 0; k < 2; k++) {
    const tilt: Axes = [rotate(f, l, -0.55 - k * 0.3), l, rotate(u, l, -0.55 - k * 0.3)];
    fig.ellipsoid(hp([-5.4 - k * 1.2, 0, -1.6 - k * 2.6]), tilt, [1.3, 6.6 - k * 0.4, 2.0], M.steel);
  }
  for (const s of [1, -1]) fig.box(hp([2.4, s * 6.3, -3.2]), axes, [2.4, 0.5, 3.4], M.steel);
  fig.sphere(hp([-0.3, 0, 1.4]), 7.1, M.steel, { n: u, at: hp([0, 0, 0.2]) });
  // Gilt flutes up the skull.
  for (const a of [0.6, 1.57, 2.55, -0.6, -1.57, -2.55]) {
    const d = norm(add(scale(f, Math.cos(a)), scale(l, Math.sin(a))));
    fig.capsule(madd(hp([-0.3, 0, 2.0]), d, 6.9), madd(hp([-0.3, 0, 7.6]), d, 2.4), 0.38, M.brass);
  }
  fig.cone(hp([-0.3, 0, 7.6]), hp([-0.3, 0, 13.4]), 1.5, 0.3, M.gold);
  fig.sphere(hp([-0.3, 0, 8.4]), 1.5, M.gold);
  fig.box(hp([6.2, 0, 1.2]), [rotate(f, l, 0.3), l, rotate(u, l, 0.3)], [2.8, 5.2, 0.45], M.steel);
  fig.capsule(hp([7.4, 0, 6.2]), hp([7.6, 0, -3.4]), 0.5, M.brass);
  fig.ellipsoid(hp([7.6, 0, -4.2]), axes, [0.5, 1.3, 1.6], M.brass);
}

/** Magierka: a rounded team felt crown in a deep black felt brim turned up, slit at the front, a gilt brooch with a short feather in the slit. */
export function magierka(fig: Figure, hc: V3, axes: Axes): void {
  const [, , u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.ellipsoid(hp([-0.4, 0, 4.4]), axes, [6.6, 6.6, 8.0], M.team, { n: u, at: hp([0, 0, 0]) });
  fig.cone(hp([-0.4, 0, 0.2]), hp([-0.4, 0, 5.4]), 7.6, 8.2, P.felt);
  fig.sphere(hp([7.6, 0, 3.2]), 1.4, M.gold);
  fig.capsule(hp([7.2, 0, 4.2]), hp([4.6, 0.8, 13.6]), 0.9, M.feather);
}

/** Shield on the left forearm, facing forward-left of the torso (baseGear's frame). */
function shieldFrame(hand: V3, T: Xform, lift: number): { face: V3; axes: Axes; c: V3 } {
  const face = norm(rotate(T.x, T.z, 0.42));
  const axes = axesAlong(face, T.y);
  return { face, axes, c: madd(madd(hand, face, 2.0), T.z, lift) };
}

/** Round Slavic shield: a broad team field in a studded iron rim, a domed boss in a gilt ring. */
export function slavShield(fig: Figure, hand: V3, T: Xform): void {
  const { face, axes, c } = shieldFrame(hand, T, 1.8);
  fig.ellipsoid(madd(c, face, -0.45), axes, [0.8, 9.3, 9.3], P.rimIron);
  fig.ellipsoid(c, axes, [1.1, 8.5, 8.5], M.team);
  fig.ellipsoid(madd(c, face, 0.8), axes, [0.4, 3.1, 3.1], M.brass);
  fig.sphere(madd(c, face, 1.1), 2.3, M.steel);
}

/**
 * Heater shield with the crowned white eagle on the team field: the
 * eagle's body, head, spread wings and legs, each laid over a slightly
 * larger dark outline, and a gilt crown and beak.
 */
export function eagleHeater(fig: Figure, hand: V3, T: Xform): void {
  const { face, axes, c } = shieldFrame(hand, T, 2.5);
  const clip = { n: scale(T.z, -1), at: madd(c, T.z, 5.2) };
  fig.ellipsoid(madd(c, face, -0.3), axes, [1.2, 7.6, 9.9], P.eagleEdge, clip);
  fig.ellipsoid(c, axes, [1.5, 7.0, 9.4], M.team, clip);
  const [, across, up] = axes;
  const e = (a: number, b: number, d: number): V3 => madd(madd(madd(c, face, d), across, a), up, b);
  // Outline, then the white eagle over it.
  for (const [mat, d, grow] of [[P.eagleEdge, 1.45, 0.45], [P.eagle, 1.75, 0]] as const) {
    fig.ellipsoid(e(0, -0.2, d), axes, [0.4, 1.3 + grow, 3.1 + grow], mat);
    fig.sphere(e(0.4, 3.2, d), 1.1 + grow, mat);
    for (const s of [1, -1]) {
      const wing = norm(add(scale(across, s), scale(up, 0.5)));
      fig.box(e(s * 2.6, 0.8, d - 0.1), axesAlong(face, wing), [0.32, 2.4 + grow, 0.85 + grow], mat);
      fig.box(e(s * 1.1, -3.6, d - 0.1), axesAlong(face, norm(add(scale(across, s * 0.5), scale(up, -1)))), [0.32, 1.3 + grow, 0.5 + grow], mat);
    }
  }
  fig.box(e(0.4, 4.6, 1.9), axes, [0.3, 1.0, 0.55], P.crown);
  fig.sphere(e(1.4, 3.0, 1.9), 0.55, P.crown);
}

/**
 * Hussar wings: two crimson-lacquered frames bolted to the back plate,
 * rising behind the head, splaying outwards and curving forward over
 * it, each set with a row of white feathers (every other one dark-tipped)
 * fanning back and out, so the pair reads as wings from the front too.
 */
const hussarWings: BackItemPainter = (fig, torso) => {
  const frame: readonly V3[] = [[-4.6, 3.2, 8.0], [-6.6, 4.2, 17.0], [-7.8, 5.6, 27.0], [-7.0, 6.8, 35.0], [-4.8, 7.2, 39.6]];
  for (const s of [1, -1]) {
    const pts = frame.map(([x, y, z]) => torso([x, s * y, z]));
    for (let i = 0; i < pts.length - 1; i++) fig.capsule(pts[i]!, pts[i + 1]!, 0.85, P.wingFrame);
    // Feathers: from the frame backwards and a little out, the row thinning towards the top.
    const n = 11;
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const seg = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1)));
      const local = t * (pts.length - 1) - seg;
      const a = frame[seg]!;
      const b = frame[seg + 1]!;
      const q: V3 = [a[0] + (b[0] - a[0]) * local, a[1] + (b[1] - a[1]) * local, a[2] + (b[2] - a[2]) * local];
      const len = 3.8 - t * 1.2;
      const root = torso([q[0], s * q[1], q[2]]);
      const tip = torso([q[0] - len * 0.8, s * (q[1] + 1.6 + t * 1.2), q[2] - 0.8 - t * 1.8]);
      fig.capsule(root, tip, 1.15, P.wingFeather);
      if (k % 2) fig.sphere(tip, 0.95, P.wingTip);
    }
  }
};

export const POLISH_HATS = {
  slavHelm: { draw: slavHelm, coversHead: false },
  kapalin: { draw: kapalin, coversHead: false },
  szyszak: { draw: szyszak, coversHead: false },
  magierka: { draw: magierka, coversHead: false },
} satisfies Record<string, HatDef>;

export const POLISH_SHIELDS = { slavShield, eagleHeater } satisfies Record<string, ShieldPainter>;

export const POLISH_BACK_ITEMS = { hussarWings } satisfies Record<string, BackItemPainter>;
