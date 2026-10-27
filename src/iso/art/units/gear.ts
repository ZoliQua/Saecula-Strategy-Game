import { drawBow } from './baseGear';
import { axesAlong, type Axes, type Figure } from './figure';
import { BACK_ITEMS, HATS, SHIELDS, WEAPON_STYLES, type BackItem, type HatKind, type ShieldKind, type WeaponStyle } from './gearRegistry';
import type { WeaponPose } from './humanoid';
import { M } from './materials';
import { cross, madd, norm, type V3, type Xform } from './rigMath';

/*
 * Shared gear painters: hats, shields, back items and weapon styles are
 * looked up by id in gearRegistry.ts (base gear: baseGear.ts; a civ's
 * own: units/<civ>/). This file names no civ; the weapon kinds below are
 * the base look of each kind, which also picks the pose (poses.ts).
 */

export type { BackItem, HatKind, ShieldKind, WeaponStyle };

/** Weapon kinds (they also pick the pose, see poses.ts). */
export type WeaponKind = 'tool' | 'gladius' | 'sabre' | 'bow' | 'pike' | 'spear' | 'crossbow' | 'musket' | 'lance';

/** Paints a hat around the head centre `hc` (head axes fwd/left/up). */
export type HatPainter = (fig: Figure, hc: V3, axes: Axes) => void;
export interface HatDef {
  readonly draw: HatPainter;
  /** The hat hides the whole head (great helm, hood): no hair is painted under it. */
  readonly coversHead: boolean;
}
/** Paints a shield on the left forearm (`hand`), facing forward-left of the torso frame `T`. */
export type ShieldPainter = (fig: Figure, hand: V3, T: Xform) => void;
/** Paints gear slung on the back or hip; `at` maps torso-local points to rig space. */
export type BackItemPainter = (fig: Figure, at: (p: V3) => V3, T: Xform) => void;
/** A visual variant of a weapon kind (same pose); `d` is the weapon axis, `side` its blade side. */
export interface WeaponStyleDef {
  readonly kind: WeaponKind;
  draw(fig: Figure, w: WeaponPose, d: V3, side: V3): void;
}

/** Helmets, hats and hoods around the head centre `hc` (head axes fwd/left/up). */
export function drawHat(fig: Figure, kind: HatKind, hc: V3, axes: Axes): void {
  HATS[kind].draw(fig, hc, axes);
}

/** True when the hat hides the head (no hair under it). */
export function hatCoversHead(kind: HatKind): boolean {
  return HATS[kind].coversHead;
}

/** Shield on the left forearm, facing forward-left of the torso. */
export function drawShield(fig: Figure, kind: ShieldKind, hand: V3, T: Xform): void {
  SHIELDS[kind](fig, hand, T);
}

/** Gear on the back or hip (quiver, bolt case). */
export function drawBackItem(fig: Figure, kind: BackItem, at: (p: V3) => V3, T: Xform): void {
  BACK_ITEMS[kind](fig, at, T);
}

/** Blade / head side of a weapon: perpendicular to `dir`, in the swing plane. */
function bladeSide(dir: V3): V3 {
  const s = cross([0, 1, 0], dir);
  return Math.hypot(s[0], s[1], s[2]) < 1e-4 ? [0, 0, -1] : norm(s);
}

/** The held weapon; `hands` are where the hands actually are. */
export function drawWeapon(fig: Figure, kind: WeaponKind, w: WeaponPose, _hands: { handL: V3; handR: V3 }, style?: WeaponStyle): void {
  const d = norm(w.dir);
  const at = (k: number): V3 => madd(w.at, d, k);
  const side = bladeSide(d);
  const styled = style === undefined ? undefined : WEAPON_STYLES[style];
  if (styled?.kind === kind) {
    styled.draw(fig, w, d, side);
    return;
  }
  switch (kind) {
    case 'tool': {
      fig.capsule(at(-4), at(11.5), 0.95, M.wood);
      fig.box(at(11), axesAlong(side, d), [4.4, 0.85, 0.75], M.darkSteel);
      fig.sphere(madd(at(11), side, 4.4), 0.8, M.steel);
      break;
    }
    case 'gladius':
      fig.capsule(at(-1.6), at(1.4), 0.85, M.darkWood);
      fig.sphere(at(-2.1), 1.25, M.brass);
      fig.capsule(madd(at(1.9), side, -2.6), madd(at(1.9), side, 2.6), 0.8, M.brass);
      fig.capsule(at(2.4), at(11.5), 1.1, M.steel);
      fig.cone(at(11.5), at(14), 1.1, 0.1, M.steel);
      break;
    case 'sabre': {
      fig.capsule(at(-1.6), at(1.4), 0.85, M.darkWood);
      fig.capsule(madd(at(1.8), side, -2.0), madd(at(-1.6), side, -1.8), 0.55, M.brass);
      let p = at(1.8);
      for (const [len, bend] of [[5, 0.25], [5, 0.7], [4.5, 1.3]] as const) {
        const q = madd(madd(p, d, len), side, bend);
        fig.capsule(p, q, 0.85, M.steel);
        p = q;
      }
      break;
    }
    case 'spear':
      fig.capsule(at(-12), at(20), 0.8, M.wood);
      fig.cone(at(19.5), at(25.5), 1.45, 0.05, M.steel);
      break;
    case 'pike':
      fig.capsule(at(-17), at(50), 0.8, M.darkWood);
      fig.cone(at(49.5), at(57), 1.4, 0.05, M.steel);
      break;
    case 'lance':
      fig.cone(at(-9), at(36), 1.15, 0.45, M.wood);
      fig.cone(at(0.4), at(3.6), 0.8, 3.0, M.steel);
      fig.box(madd(at(31), side, 2.1), axesAlong(d, side), [2.6, 2.0, 0.18], M.team);
      break;
    case 'bow':
      drawBow(fig, w, d);
      break;
    case 'crossbow':
      drawCrossbow(fig, w, d);
      break;
    case 'musket':
      fig.cone(at(-4.5), at(5.5), 1.75, 1.05, M.darkWood);
      fig.capsule(at(5.5), at(19), 0.9, M.wood);
      fig.capsule(at(3.5), at(27.5), 0.6, M.iron);
      fig.cone(madd(at(27), side, 0.8), madd(at(33.5), side, 0.8), 0.4, 0.05, M.steel);
      break;
  }
}

function drawCrossbow(fig: Figure, w: WeaponPose, d: V3): void {
  const at = (k: number): V3 => madd(w.at, d, k);
  let left = cross([0, 0, 1], d);
  left = Math.hypot(left[0], left[1], left[2]) < 1e-4 ? [0, 1, 0] : norm(left);
  // Slightly oversized so the crossbow reads at game zoom.
  fig.box(at(4.2), axesAlong(d, left), [9.2, 1.4, 1.6], M.wood);
  const prodC = at(12);
  const limb = (t: number): V3 => madd(madd(prodC, left, 10 * t), d, -2.8 * t * t);
  for (const s of [1, -1]) {
    fig.capsule(prodC, limb(s * 0.5), 1.25, M.darkSteel);
    fig.capsule(limb(s * 0.5), limb(s), 1.0, M.darkSteel);
  }
  const nut = w.loaded ? at(3.4) : at(11.2);
  fig.capsule(limb(1), nut, 0.3, M.string);
  fig.capsule(limb(-1), nut, 0.3, M.string);
  if (w.loaded) {
    fig.capsule(at(3.4), at(12.6), 0.5, M.wood);
    fig.cone(at(12.6), at(14.6), 0.85, 0.05, M.steel);
  }
}
