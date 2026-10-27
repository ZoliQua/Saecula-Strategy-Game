import { axesAlong, type Axes, type Figure } from './figure';
import {
  drawBackItem,
  drawHat,
  drawShield,
  drawWeapon,
  hatCoversHead,
  type BackItem,
  type HatKind,
  type ShieldKind,
  type WeaponKind,
  type WeaponStyle,
} from './gear';
import { M, type Material } from './materials';
import { add, applyDir, applyPoint, ik2, madd, norm, rotate, sub, type V3, type Xform } from './rigMath';

/** Body proportions (art px). Slightly chibi so figures read at 1:2 scale. */
export const BODY = {
  hipW: 3.1,
  thigh: 9.2,
  shin: 8.9,
  ankleZ: 1.8,
  pelvisZ: 18,
  shoulderUp: 13,
  shoulderW: 6.1,
  upperArm: 7.6,
  foreArm: 7.4,
  headUp: 21.2,
  headR: 6.3,
} as const;

export interface HumanLook {
  readonly hat: HatKind;
  /** Torso garment (team colour for tunics and coats). */
  readonly body: Material;
  /** Chest armour over the garment. */
  readonly armour?: Material;
  readonly pauldrons?: Material;
  /** Tunic / coat skirt below the belt (length in art px). */
  readonly skirt?: { readonly mat: Material; readonly length: number };
  readonly sleeves: Material;
  readonly forearms?: Material;
  readonly hands?: Material;
  readonly legs: Material;
  readonly boots: Material;
  readonly highBoots?: boolean;
  readonly belt?: Material;
  readonly crossBelts?: Material;
  readonly back?: BackItem;
  readonly weapon: WeaponKind;
  /** Visual variant of the weapon (same pose). */
  readonly weaponStyle?: WeaponStyle;
  readonly shield?: ShieldKind;
  readonly hair?: Material;
}

/** Where the held weapon is (rig space). */
export interface WeaponPose {
  /** Grip point (the main hand holds it here). */
  readonly at: V3;
  /** Weapon main axis (blade / shaft / barrel, pointing away from the grip end). */
  readonly dir: V3;
  /** Bow string pull point while drawing; null = relaxed. */
  readonly draw?: V3 | null;
  /** Show a nocked arrow / loaded bolt. */
  readonly loaded?: boolean;
}

export interface HumanPose {
  readonly pelvis: V3;
  /** Forward pitch of the torso (rad). */
  readonly lean: number;
  /** Shoulder yaw (rad); positive turns the left shoulder back. */
  readonly twist: number;
  readonly footL: V3;
  readonly footR: V3;
  readonly handL: V3;
  readonly handR: V3;
  readonly headPitch?: number;
  /** Rider: knees bend forward-out around the horse. */
  readonly mounted?: boolean;
  readonly weapon: WeaponPose;
}

/** Torso frame: pelvis origin, twisted then leaned. */
export function torsoFrame(pose: HumanPose): Xform {
  const zAxis: V3 = [0, 0, 1];
  let x: V3 = rotate([1, 0, 0], zAxis, pose.twist);
  const y: V3 = rotate([0, 1, 0], zAxis, pose.twist);
  let z: V3 = zAxis;
  x = rotate(x, y, pose.lean);
  z = rotate(z, y, pose.lean);
  return { x, y, z, t: pose.pelvis };
}

/** Paints one humanoid in the figure's current placement. */
export function drawHuman(fig: Figure, look: HumanLook, pose: HumanPose): void {
  const T = torsoFrame(pose);
  const at = (p: V3): V3 => applyPoint(T, p);
  const tAxes: Axes = [T.x, T.y, T.z];
  drawLegs(fig, look, pose, T);

  // Hips, torso, skirt, belt.
  fig.ellipsoid(at([0, 0, 0.6]), tAxes, [4.0, 5.3, 4.0], look.legs);
  fig.ellipsoid(at([0, 0, 7.8]), tAxes, [4.3, 6.1, 8.2], look.body);
  if (look.armour) {
    fig.ellipsoid(at([0.25, 0, 9.4]), tAxes, [4.75, 6.5, 6.9], look.armour, { n: T.z, at: at([0, 0, 3.6]) });
  }
  if (look.skirt) {
    const top = at([0, 0, 3.4]);
    const bottom = at([0, 0, 3.4 - look.skirt.length]);
    fig.cone(top, bottom, 5.6, 5.9 + look.skirt.length * 0.32, look.skirt.mat);
  }
  if (look.belt) {
    fig.ellipsoid(at([0, 0, 3.6]), tAxes, [4.65, 6.35, 1.15], look.belt);
    fig.sphere(at([4.6, 0, 3.6]), 1.05, M.gold);
  }
  if (look.crossBelts) {
    fig.capsule(at([3.6, 4.6, 12.4]), at([4.3, -4.2, 3.8]), 0.95, look.crossBelts);
    fig.capsule(at([3.6, -4.6, 12.4]), at([4.3, 4.2, 3.8]), 0.95, look.crossBelts);
  }
  if (look.back) drawBackItem(fig, look.back, at, T);

  // Neck and head.
  fig.capsule(at([0, 0, 13.4]), at([0.2, 0, 16.4]), 2.4, M.skin);
  const headAxes = headFrame(T, pose.headPitch ?? 0);
  const hc = at([0.4, 0, BODY.headUp]);
  const hp = (p: V3): V3 => madd(madd(madd(hc, headAxes[0], p[0]), headAxes[1], p[1]), headAxes[2], p[2]);
  fig.sphere(hc, BODY.headR, M.skin);
  fig.sphere(hp([5.35, 2.35, 0.9]), 0.95, M.eye);
  fig.sphere(hp([5.35, -2.35, 0.9]), 0.95, M.eye);
  fig.sphere(hp([6.2, 0, -0.7]), 1.15, M.skin);
  if (!hatCoversHead(look.hat)) {
    fig.sphere(hp([-1.0, 0, 0.9]), 6.35, look.hair ?? M.hair);
  }
  drawHat(fig, look.hat, hc, headAxes);

  drawArms(fig, look, pose, T);
  drawWeapon(fig, look.weapon, pose.weapon, { handL: armReach(T, pose, 1).end, handR: armReach(T, pose, -1).end }, look.weaponStyle);
  if (look.shield) drawShield(fig, look.shield, armReach(T, pose, 1).end, T);
}

function headFrame(T: Xform, pitch: number): Axes {
  // The head stays nearly upright when the torso leans.
  const up = norm(add([0, 0, 1], [T.z[0] * 0.4, T.z[1] * 0.4, T.z[2] * 0.4]));
  const fwd = norm(sub(T.x, [up[0] * T.x[2], up[1] * T.x[2], up[2] * T.x[2]]));
  const a = axesAlong(fwd, T.y);
  const x = rotate(a[0], a[1], pitch);
  const z = rotate(a[2], a[1], pitch);
  return [x, a[1], z];
}

function drawLegs(fig: Figure, look: HumanLook, pose: HumanPose, T: Xform): void {
  for (const side of [1, -1]) {
    const hip = applyPoint(T, [0, side * BODY.hipW, -0.5]);
    const foot = side > 0 ? pose.footL : pose.footR;
    const pole: V3 = pose.mounted ? [1, side * 0.9, -0.2] : [1, side * 0.15, 0];
    const { mid: knee, end: ankle } = ik2(hip, foot, BODY.thigh, BODY.shin, pole);
    fig.capsule(hip, knee, 2.75, look.legs);
    const shinMat = look.highBoots ? look.boots : look.legs;
    fig.capsule(knee, ankle, look.highBoots ? 2.55 : 2.3, shinMat);
    const fwd = norm([T.x[0], T.x[1], 0]);
    const footAxes = axesAlong(fwd, [-fwd[1], fwd[0], 0]);
    fig.ellipsoid(madd(madd(ankle, fwd, 1.5), [0, 0, 1], -0.4), footAxes, [3.4, 2.05, 1.75], look.boots);
    if (!look.highBoots) fig.capsule(ankle, madd(ankle, norm(sub(knee, ankle)), 2.2), 2.45, look.boots);
  }
}

/** Shoulder → hand chain for one side (+1 = left). */
function armReach(T: Xform, pose: HumanPose, side: number): { shoulder: V3; mid: V3; end: V3 } {
  const shoulder = applyPoint(T, [0, side * BODY.shoulderW, BODY.shoulderUp]);
  const target = side > 0 ? pose.handL : pose.handR;
  const pole = applyDir(T, [-0.55, side * 0.75, -0.55]);
  const { mid, end } = ik2(shoulder, target, BODY.upperArm, BODY.foreArm, pole);
  return { shoulder, mid, end };
}

function drawArms(fig: Figure, look: HumanLook, pose: HumanPose, T: Xform): void {
  for (const side of [1, -1]) {
    const { shoulder, mid, end } = armReach(T, pose, side);
    fig.capsule(shoulder, mid, 2.35, look.sleeves);
    fig.capsule(mid, end, 2.05, look.forearms ?? look.sleeves);
    fig.sphere(end, 2.15, look.hands ?? M.skin);
    if (look.pauldrons) fig.sphere(madd(shoulder, T.z, 0.6), 3.1, look.pauldrons);
  }
}
