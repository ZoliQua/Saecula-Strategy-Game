import { axesAlong, type Axes, type Figure } from '../figure';
import type { BackItemPainter, HatDef, ShieldPainter, WeaponStyleDef } from '../gear';
import { M } from '../materials';
import { add, madd, norm, rotate, scale, type V3, type Xform } from '../rigMath';
import { RUSSIAN_M } from './russianMaterials';

const R = RUSSIAN_M;

/*
 * Russian headgear, shield and berdysh (M5): one silhouette cue per age
 * — the tall pointed shelom of the druzhina, its mail aventail falling
 * to the shoulders (Kievan Rus), the tall shishak, a ribbed bowl drawn
 * into a long needle spike over ear flaps and a nape guard, and the
 * crimson-rimmed teardrop shield (Muscovy), and the Streltsy's
 * fur-trimmed kolpak with the berdysh, a crescent-bladed poleaxe,
 * slung on the back (the Enlightenment). The shield bears the St
 * Andrew's saltire on a small badge outlined dark. The cossack (M8)
 * wears the tall black papakha, the gazyri cartridge loops on the
 * cherkeska's breast and a kinzhal at the belt, and carries the
 * guardless shashka. Registered in gearRegistry.ts.
 */

/** Head-local point: hc + f·p0 + l·p1 + u·p2. */
const at = (hc: V3, [f, l, u]: Axes, p: V3): V3 => madd(madd(madd(hc, f, p[0]), l, p[1]), u, p[2]);

/**
 * Shelom: a tall steel cone to a high point with a gilt knob and a
 * team-coloured pennon (yalovets), a gilt brow band, a nasal and a mail
 * aventail round the neck.
 */
export function shelom(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  // The aventail first: a flared mail skirt round the back and sides of the neck.
  fig.cone(hp([-1.8, 0, -0.6]), hp([-2.4, 0, -7.2]), 6.8, 7.6, M.mail);
  fig.sphere(hp([-0.2, 0, 1.0]), 6.85, M.steel, { n: u, at: hp([0, 0, 0.6]) });
  fig.cone(hp([-0.2, 0, 3.6]), hp([-1.0, 0, 18.4]), 5.9, 0.3, M.steel);
  fig.cone(hp([-0.2, 0, 0.4]), hp([-0.2, 0, 2.2]), 7.1, 6.95, M.brass);
  fig.sphere(hp([-1.0, 0, 18.6]), 1.0, M.brass);
  fig.box(hp([-4.0, 0, 15.6]), [f, l, u], [2.8, 0.3, 1.7], M.team);
  fig.box(hp([6.7, 0, -1.6]), [f, l, u], [0.45, 0.8, 3.0], M.steel);
}

/** Shishak: a ribbed steel bowl drawn into a long needle spike with a ball, ear flaps, a nape guard and a sliding nasal. */
export function shishak(fig: Figure, hc: V3, axes: Axes): void {
  const [, , u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.cone(hp([-2.8, 0, -1.0]), hp([-4.2, 0, -7.4]), 6.4, 8.2, M.darkSteel);
  for (const s of [1, -1]) fig.box(hp([0.4, s * 6.4, -3.4]), axes, [2.6, 0.5, 3.6], M.darkSteel);
  fig.sphere(hp([-0.2, 0, 0.8]), 7.0, M.steel, { n: u, at: hp([0, 0, 0.2]) });
  fig.cone(hp([-0.2, 0, 4.6]), hp([-0.3, 0, 9.6]), 5.4, 1.6, M.steel);
  for (const [df, dl] of [[1, 0], [0, 1], [0, -1], [-1, 0]] as const) {
    fig.capsule(hp([-0.2 + df * 6.8, dl * 6.8, 1.0]), hp([-0.3 + df * 1.6, dl * 1.6, 9.2]), 0.45, M.brass);
  }
  // The needle spike and its ball.
  fig.capsule(hp([-0.3, 0, 9.4]), hp([-0.5, 0, 21.0]), 0.55, M.steel);
  fig.sphere(hp([-0.5, 0, 21.2]), 1.15, M.brass);
  fig.cone(hp([-0.2, 0, 0.0]), hp([-0.2, 0, 1.6]), 7.2, 7.1, M.brass);
  fig.capsule(hp([7.0, 0, 3.6]), hp([7.1, 0, -3.4]), 0.45, M.steel);
}

/** Streltsy kolpak: a tall team-coloured cap, its crown rounded and leaning back, over a deep band of dark fur. */
export function kolpak(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l, u] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.sphere(hp([-0.3, 0, 1.4]), 6.7, M.team, { n: u, at: hp([0, 0, 1.2]) });
  const lean: Axes = [rotate(f, l, 0.2), l, rotate(u, l, 0.2)];
  fig.cone(hp([-0.3, 0, 2.6]), hp([-2.6, 0, 12.4]), 6.1, 5.0, M.team);
  fig.ellipsoid(hp([-2.7, 0, 12.4]), lean, [5.0, 5.0, 2.6], M.team);
  fig.cone(hp([-0.3, 0, 0.2]), hp([-0.4, 0, 6.0]), 8.0, 7.8, R.fur);
}

/** Shield on the left forearm, facing forward-left of the torso (baseGear's frame). */
function shieldFrame(hand: V3, T: Xform, lift: number): { face: V3; axes: Axes; c: V3 } {
  const face = norm(rotate(T.x, T.z, 0.42));
  const axes = axesAlong(face, T.y);
  return { face, axes, c: madd(madd(hand, face, 2.0), T.z, lift) };
}

/**
 * Teardrop shield: a rounded top drawn down to a point, its team field
 * inside a dark crimson rim, a St Andrew's saltire badge (blue on
 * white, outlined dark) at its centre.
 */
export function teardropShield(fig: Figure, hand: V3, T: Xform): void {
  const { face, axes, c } = shieldFrame(hand, T, 2.4);
  const [, across, up] = axes;
  const top = madd(c, up, 2.6);
  // The crimson rim: the same outline a touch larger, just behind the field.
  fig.ellipsoid(madd(top, face, -0.45), axes, [0.9, 6.0, 5.6], R.crimson);
  fig.cone(madd(madd(top, face, -0.45), up, -0.4), madd(madd(c, face, -0.45), up, -11.0), 6.0, 0.5, R.crimson);
  fig.ellipsoid(top, axes, [1.2, 5.2, 4.8], M.team);
  fig.cone(madd(top, up, -0.4), madd(c, up, -9.8), 5.2, 0.4, M.team);
  saltire(fig, (a, b, d) => madd(madd(madd(c, face, d), across, a), up, b), face, across, 1.4, 1.2);
}

/**
 * St Andrew's saltire badge at face-local (0, y): a dark outline panel,
 * the white square, the two blue diagonals. `e(a, b, d)` maps across a,
 * up b, d out of the face to rig space.
 */
function saltire(fig: Figure, e: (a: number, b: number, d: number) => V3, face: V3, across: V3, d: number, y: number): void {
  const flat = axesAlong(face, across);
  fig.box(e(0, y, d - 0.3), flat, [0.22, 2.75, 2.75], R.saltireEdge);
  fig.box(e(0, y, d), flat, [0.22, 2.2, 2.2], R.saltireWhite);
  for (const s of [1, -1]) {
    fig.box(e(0, y, d + 0.25), axesAlong(face, rotate(across, face, (s * Math.PI) / 4)), [0.2, 2.7, 0.55], R.saltireBlue);
  }
}

/**
 * Berdysh slung on the back: a long ash haft across the shoulders, its
 * crescent blade standing out beside the head on the right, so it reads
 * in every heading without covering the team-coloured coat.
 */
export const berdysh: BackItemPainter = (fig, at, T) => {
  const foot = at([-5.2, 4.2, -7.0]);
  const head = at([-5.2, -4.6, 26.0]);
  fig.capsule(foot, head, 0.6, R.haft);
  const side = scale(T.y, -1);
  const blade: V3[] = [-1.0, 3.0, 7.0, 11.0, 15.0].map((k, i) => madd(madd(at([-5.6, -4.0, 14.0]), T.z, k), side, 2.6 + [0.8, 2.4, 3.2, 2.6, 1.0][i]!));
  for (let i = 0; i < blade.length - 1; i++) fig.capsule(blade[i]!, blade[i + 1]!, 1.9, M.steel);
  fig.capsule(at([-5.6, -4.0, 13.6]), blade[0]!, 0.5, M.darkSteel);
  fig.capsule(add(blade[blade.length - 1]!, scale(side, -1.6)), blade[blade.length - 1]!, 0.5, M.darkSteel);
};

/**
 * Papakha (M8): a tall, straight-sided drum of shaggy black sheepskin
 * worn from the brow up, a little wider at the top, its flat crown
 * covered in team cloth crossed by silver galloon.
 */
export function papakha(fig: Figure, hc: V3, axes: Axes): void {
  const [f, l] = axes;
  const hp = (p: V3): V3 => at(hc, axes, p);
  // The drum sits on the head from the brow up, flaring a little to a shaggy rim.
  fig.cone(hp([-0.4, 0, 2.2]), hp([-0.6, 0, 11.2]), 6.7, 7.4, R.blackFur);
  for (const [z, r] of [[3.4, 7.0], [6.6, 7.2], [9.8, 7.6]] as const) {
    fig.ellipsoid(hp([-0.5, 0, z]), axes, [r, r, 1.4], R.blackFur);
  }
  fig.ellipsoid(hp([-0.6, 0, 11.2]), axes, [6.9, 6.9, 1.0], M.team);
  for (const d of [f, l]) fig.capsule(madd(hp([-0.6, 0, 12.1]), d, 6.1), madd(hp([-0.6, 0, 12.1]), d, -6.1), 0.45, R.silver);
}

/**
 * Gazyri (M8): a row of five cartridge tubes in loops on each breast of
 * the cherkeska, their bone caps standing up, a silver-mounted kinzhal
 * hanging at the front of the belt.
 */
const gazyri: BackItemPainter = (fig, torso) => {
  for (const s of [1, -1]) {
    // A dark pocket band, then the tubes standing slightly splayed along it.
    fig.capsule(torso([4.5, s * 1.4, 10.0]), torso([3.1, s * 5.2, 10.6]), 1.25, R.blackFur);
    for (let k = 0; k < 5; k++) {
      const y = s * (1.3 + k * 0.95);
      const x = 4.6 - (k * k) * 0.075;
      fig.capsule(torso([x + 0.3, y, 9.4]), torso([x + 0.4, y, 12.4]), 0.5, R.bone);
      fig.sphere(torso([x + 0.4, y, 12.7]), 0.5, R.silver);
    }
  }
  // The kinzhal: a silver hilt, a black scabbard down the front of the belt.
  fig.capsule(torso([5.2, 0.4, 5.6]), torso([5.0, 0.4, 3.4]), 0.55, R.silver);
  fig.cone(torso([5.0, 0.4, 3.0]), torso([5.4, 0.6, -4.0]), 0.8, 0.4, M.blackBoot);
};

/** Shashka: a long, gently curved single-edged blade with no guard, the grip ending in a split pommel. */
function shashka(fig: Figure, at: (k: number) => V3, d: V3, side: V3): void {
  fig.capsule(at(-1.8), at(1.6), 0.8, R.horn);
  fig.capsule(madd(at(-2.2), side, -0.7), madd(at(-2.2), side, 0.7), 0.7, R.silver);
  let p = at(1.8);
  for (const [len, bend] of [[5.5, 0.15], [5.5, 0.45], [5, 0.9]] as const) {
    const q = madd(madd(p, d, len), side, bend);
    fig.capsule(p, q, 0.75, M.steel);
    p = q;
  }
}

export const RUSSIAN_HATS = {
  shelom: { draw: shelom, coversHead: false },
  shishak: { draw: shishak, coversHead: false },
  kolpak: { draw: kolpak, coversHead: false },
  papakha: { draw: papakha, coversHead: false },
} satisfies Record<string, HatDef>;

export const RUSSIAN_SHIELDS = { teardropShield } satisfies Record<string, ShieldPainter>;

export const RUSSIAN_BACK_ITEMS = { berdysh, gazyri } satisfies Record<string, BackItemPainter>;

export const RUSSIAN_WEAPON_STYLES = {
  shashka: { kind: 'sabre', draw: (fig, w, d, side) => shashka(fig, (k) => madd(w.at, d, k), d, side) },
} satisfies Record<string, WeaponStyleDef>;
