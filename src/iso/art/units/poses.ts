import type { WeaponKind } from './gear';
import type { HumanPose, WeaponPose } from './humanoid';
import type { UnitAnim } from './layout';
import { madd, norm, type V3 } from './rigMath';

/**
 * Key poses of the foot soldiers (rig space, x forward, y left, z up).
 * Every animation frame is an explicit pose: pelvis, torso lean/twist,
 * foot and hand targets (limbs are solved by IK) and the weapon.
 */
const TAU = Math.PI * 2;
const ANKLE = 1.8;
const PELVIS = 18;

interface Base {
  pelvisZ: number;
  lean: number;
  twist: number;
  footL: V3;
  footR: V3;
  /** Free-arm swing (−1..1) while walking. */
  swing: number;
  headPitch?: number;
}

function idleBase(i: number): Base {
  return { pelvisZ: PELVIS + i * 0.35, lean: 0.03 + i * 0.015, twist: 0, footL: [0.8, 3.5, ANKLE], footR: [-0.8, -3.5, ANKLE], swing: 0 };
}

function walkBase(i: number): Base {
  const s = (TAU * i) / 6;
  const foot = (phase: number, y: number): V3 => [5.6 * Math.cos(phase), y, ANKLE + 3.4 * Math.max(0, -Math.sin(phase))];
  return {
    pelvisZ: PELVIS - 0.9 + 1.1 * Math.abs(Math.sin(s)),
    lean: 0.1,
    twist: 0.14 * Math.cos(s),
    footL: foot(s, 3.2),
    footR: foot(s + Math.PI, -3.2),
    swing: Math.cos(s),
  };
}

/** Free hand hanging at the side, swinging with the stride. */
function freeHand(side: number, swing: number, pelvisZ: number): V3 {
  return [1 - 4.2 * swing * side, side * 7.3, pelvisZ - 0.6 + 1.4 * Math.max(0, -swing * side)];
}

function pose(b: Base, handL: V3, handR: V3, weapon: WeaponPose, extra: Partial<HumanPose> = {}): HumanPose {
  return {
    pelvis: [0, 0, b.pelvisZ],
    lean: b.lean,
    twist: b.twist,
    footL: b.footL,
    footR: b.footR,
    handL,
    handR,
    ...(b.headPitch !== undefined ? { headPitch: b.headPitch } : {}),
    weapon,
    ...extra,
  };
}

const up = (v: V3, dz: number): V3 => [v[0], v[1], v[2] + dz];
const w = (at: V3, dir: V3, extra: Partial<WeaponPose> = {}): WeaponPose => ({ at, dir: norm(dir), ...extra });

/** Rest / carry pose of the weapon arm for idle and walk. */
function carry(kind: WeaponKind, b: Base): HumanPose {
  const dz = b.pelvisZ - PELVIS;
  const freeL = freeHand(1, b.swing, b.pelvisZ);
  const freeR = freeHand(-1, b.swing, b.pelvisZ);
  switch (kind) {
    case 'tool': {
      const at = up([2.6, -7.0, 17.2], dz);
      return pose(b, freeL, at, w(at, [0.32, 0, 1]));
    }
    case 'gladius': {
      const at = up([4.2, -6.4, 19.5], dz);
      return pose(b, up([5.4, 5.2, 19.5], dz), at, w(at, [0.5, -0.08, 0.86]));
    }
    case 'pike': {
      const at = up([2.6, -6.8, 21.5], dz);
      // Walking shoulders the pike, leaning back.
      const dir: V3 = b.swing !== 0 || b.lean > 0.05 ? [-0.22, 0, 1] : [0.04, 0, 1];
      return pose(b, freeL, at, w(at, dir));
    }
    case 'bow': {
      // Bow held out at the side, tilted so its curve shows from most headings.
      const at = up([3.4, 8.0, 19], dz);
      return pose(b, at, freeR, w(at, [0.42, 0.3, 1]));
    }
    case 'crossbow': {
      const at = up([3.6, -3.6, 19.5], dz);
      const dir: V3 = [0.86, 0.12, -0.42];
      return pose(b, madd(at, norm(dir), 7.5), at, w(at, dir, { loaded: true }));
    }
    case 'musket': {
      const at = up([2.2, -7.4, 16.5], dz);
      return pose(b, freeL, at, w(at, [0.26, -0.14, 1]));
    }
    default: {
      const at = up([3, -6.8, 18], dz);
      return pose(b, freeL, at, w(at, [0.3, 0, 1]));
    }
  }
}

/** Foot-soldier pose for animation frame `i`. */
export function footPose(kind: WeaponKind, anim: UnitAnim, i: number): HumanPose {
  switch (anim) {
    case 'walk':
      return carry(kind, walkBase(i));
    case 'attack':
      return attackPose(kind, i);
    case 'work':
      return workPose(i);
    case 'death':
      return deathPose(kind, i);
    default:
      return carry(kind, idleBase(i));
  }
}

/** Fighting stance: feet apart, left foot forward. */
function stance(lean: number, twist: number, lunge = 0, pelvisZ = PELVIS - 0.6): Base {
  return {
    pelvisZ,
    lean,
    twist,
    footL: [3.6 + lunge, 3.8, ANKLE],
    footR: [-3.2, -3.6, ANKLE],
    swing: 0,
  };
}

function attackPose(kind: WeaponKind, i: number): HumanPose {
  switch (kind) {
    case 'gladius':
    case 'tool': {
      // Overhand chop: wind up behind the head, strike forward-down, follow through.
      const keys: Array<[V3, V3, number, number, number]> = [
        [[-0.5, -6.0, 30], [-0.25, 0, 0.97], -0.32, 0.0, 0],
        [[-3.0, -4.8, 34], [-0.8, 0, 0.6], -0.5, -0.06, 0],
        [[10.5, -2.0, 22.5], [0.86, 0.25, -0.45], 0.45, 0.2, 2.2],
        [[7.5, 2.4, 15.5], [0.38, 0.78, -0.5], 0.55, 0.16, 2.2],
        [[5.0, -5.5, 21], [0.56, 0, 0.83], 0.1, 0.06, 0.6],
      ];
      const [hand, dir, twist, lean, lunge] = keys[i] ?? keys[0]!;
      const b = stance(lean, twist, lunge);
      const shield: V3 = i === 2 || i === 3 ? [6.5, 4.6, 21.5] : [5.6, 5.2, 20];
      return pose(b, kind === 'tool' ? freeHand(1, 0.3, b.pelvisZ) : shield, hand, w(hand, dir));
    }
    case 'pike': {
      // Two-handed thrust: pull back, lunge, hold, recover.
      const back = [-2, -6, 4.5, 5.5, 0][i] ?? 0;
      const lean = [0.06, -0.04, 0.24, 0.24, 0.1][i] ?? 0;
      const dir: V3 = [1, 0, -0.07];
      const rear: V3 = [back, -3.4, 23];
      const b = stance(lean, 0.42, i === 2 || i === 3 ? 2.6 : 0);
      return pose(b, madd(rear, norm(dir), 10.5), rear, w(rear, dir));
    }
    case 'bow': {
      // Bow arm out front; draw to the cheek, release, lower.
      const bowHand: V3 = i === 4 ? [8, 5.2, 24] : [11.6, 3.6, 30.5];
      const string: V3[] = [[8.8, 1.8, 30.5], [4.0, -0.6, 31], [-0.4, -2.2, 32], [-3.6, -5.2, 31.5], [2.6, -5.6, 22]];
      const hand = string[i] ?? string[0]!;
      const draw = i <= 2 ? hand : null;
      const b = stance(0.02, -0.75, 0, PELVIS - 0.4);
      return pose(b, bowHand, hand, w(bowHand, i === 4 ? [0.45, 0.1, 1] : [0.12, 0.25, 1], { draw, loaded: i <= 2 }), { headPitch: -0.05 });
    }
    case 'crossbow':
    case 'musket': {
      // Raise, aim, fire (recoil kicks the muzzle up), settle, lower to reload.
      const dirs: V3[] = [[0.88, 0, 0.45], [1, 0, 0.02], [0.93, 0, 0.36], [0.98, 0, 0.16], [0.75, 0, -0.62]];
      const butt: V3[] = [[2.2, -3.6, 27.5], [1.8, -3.4, 30], [0.0, -3.4, 30.8], [0.9, -3.4, 30.3], [4.6, -3.6, 18.5]];
      const dir = norm(dirs[i] ?? dirs[0]!);
      const at = butt[i] ?? butt[0]!;
      const grip = madd(madd(at, dir, kind === 'musket' ? 5.0 : 2.4), [0, 0, 1], -1.2);
      const front = madd(madd(at, dir, kind === 'musket' ? 13.5 : 8.0), [0, 0, 1], -1.4);
      const b = stance(i === 4 ? 0.12 : 0.04, 0.38, 0, PELVIS - 0.4);
      const weapon = kind === 'musket' ? w(madd(at, dir, 4.5), dir) : w(madd(at, dir, 0.6), dir, { loaded: i <= 1 });
      return pose(b, front, grip, weapon, { headPitch: i === 1 ? 0.12 : 0 });
    }
    default:
      return carry(kind, idleBase(0));
  }
}

/** Villager tool swing at a tree, rock or field (two-handed). */
function workPose(i: number): HumanPose {
  const grips: V3[] = [[1.2, -2.2, 28.5], [-1.4, -1.8, 33], [9.2, -1.2, 15.5], [7.4, -1.6, 19.5]];
  const dirs: V3[] = [[-0.35, 0, 0.94], [-0.85, 0, 0.5], [0.62, 0, -0.78], [0.92, 0, -0.18]];
  const lean = [0.0, -0.06, 0.34, 0.2][i] ?? 0;
  const pelvisZ = [PELVIS, PELVIS + 0.2, PELVIS - 1.6, PELVIS - 0.9][i] ?? PELVIS;
  const grip = grips[i] ?? grips[0]!;
  const dir = norm(dirs[i] ?? dirs[0]!);
  const b: Base = { pelvisZ, lean, twist: 0.1, footL: [3.2, 3.9, ANKLE], footR: [-3.0, -3.8, ANKLE], swing: 0 };
  // The tool's head sits 11 px up the shaft; hands hold the lower end.
  const at = grip;
  const lower = madd(grip, dir, -3.6);
  return pose(b, lower, grip, w(at, dir));
}

/** Falling backwards: stagger, buckle, drop, lie still (the fall rotation is applied by the caller). */
function deathPose(kind: WeaponKind, i: number): HumanPose {
  const knees = [0, 2.5, 3.5, 1.5][i] ?? 0;
  const b: Base = {
    pelvisZ: PELVIS - knees * 0.5,
    lean: [-0.22, -0.1, 0.05, 0][i] ?? 0,
    twist: [0.15, 0.25, 0.3, 0.2][i] ?? 0,
    footL: [1.5 + knees, 3.8, ANKLE],
    footR: [-0.5 + knees * 0.6, -4.0, ANKLE],
    swing: 0,
  };
  const arms: Array<[V3, V3]> = [
    [[3, 8.5, 31], [3, -8.5, 30]],
    [[0, 10, 34], [1, -10, 33]],
    [[-2, 11, 32], [-1, -11, 31]],
    [[-1, 11.5, 27], [1, -11.5, 26]],
  ];
  const [handL, handR] = arms[i] ?? arms[0]!;
  const dir: V3 = kind === 'pike' || kind === 'musket' ? [0.3, -0.5, 1] : [0.6, -0.5, 0.6];
  return pose(b, handL, handR, w(handR, dir));
}

/** Backward fall angle (rad) and lift for death frame `i`. */
export function fallAngle(i: number): number {
  return [0.18, 0.62, 1.2, 1.5][i] ?? 0;
}
