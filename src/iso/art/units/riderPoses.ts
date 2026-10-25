import type { WeaponKind } from './gear';
import type { HumanPose } from './humanoid';
import type { UnitAnim } from './layout';
import { norm, type V3 } from './rigMath';

/** Saddle seat height (horse body frame). */
const SEAT: V3 = [-1.2, 0, 30.4];
const STIRRUP_L: V3 = [2.8, 7.4, 17.8];
const STIRRUP_R: V3 = [2.8, -7.4, 17.8];
const REIN_L: V3 = [8.2, 2.6, 31.2];

type Key = readonly [hand: V3, dir: V3, lean: number, twist: number];

/** Weapon hand + weapon direction per frame, by weapon and animation. */
const KEYS: Partial<Record<WeaponKind, Partial<Record<UnitAnim, readonly Key[]>>>> = {
  lance: {
    idle: [[[2.6, -6.6, 32.4], [0.12, -0.05, 1], 0.02, 0]],
    walk: [[[3.4, -6.4, 32.8], [0.55, -0.04, 0.83], 0.16, 0]],
    attack: [
      [[2.6, -6.2, 33.6], [0.62, 0, 0.78], 0.06, 0.05],
      [[-1.6, -5.4, 35.4], [1, 0, 0.18], 0.12, 0.25],
      [[5.2, -5.2, 35.2], [1, 0, -0.05], 0.28, 0.3],
      [[4.4, -5.2, 35.2], [1, 0, -0.02], 0.24, 0.3],
      [[2.8, -6.4, 33.4], [0.42, 0, 0.9], 0.08, 0.05],
    ],
  },
  sabre: {
    idle: [[[5.6, -6.4, 33.6], [0.5, -0.12, 0.86], 0.03, 0]],
    walk: [[[7.6, -6.0, 35.4], [0.86, 0, 0.48], 0.2, 0.05]],
    attack: [
      [[0.0, -6.0, 43.0], [-0.3, 0, 0.95], 0.0, -0.3],
      [[-2.6, -5.0, 46.4], [-0.82, 0, 0.56], -0.05, -0.45],
      [[11.0, -3.6, 33.4], [0.76, 0.22, -0.62], 0.26, 0.45],
      [[8.0, 1.8, 27.6], [0.36, 0.75, -0.55], 0.2, 0.55],
      [[5.6, -6.0, 33.6], [0.55, 0, 0.83], 0.08, 0.1],
    ],
  },
  spear: {
    idle: [[[3.0, -6.6, 31.4], [0.14, 0, 1], 0.02, 0]],
    walk: [[[5.2, -6.2, 32.8], [0.9, 0, 0.32], 0.18, 0.05]],
    attack: [
      [[3.0, -6.4, 43.6], [0.95, 0, -0.25], 0.0, -0.15],
      [[-1.8, -6.0, 45.6], [0.92, 0, -0.38], -0.06, -0.3],
      [[11.0, -5.0, 37.0], [0.85, 0, -0.52], 0.28, 0.3],
      [[10.2, -5.0, 36.6], [0.86, 0, -0.5], 0.26, 0.3],
      [[5.0, -6.0, 34.0], [0.9, 0, 0.1], 0.1, 0.05],
    ],
  },
};

/** Rider pose in the horse body frame. */
export function riderPose(kind: WeaponKind, anim: UnitAnim, i: number): HumanPose {
  const set = KEYS[kind] ?? KEYS.spear!;
  const keys = set[anim === 'death' ? 'idle' : anim === 'work' ? 'attack' : anim] ?? set.idle!;
  const [hand, dir, lean, twist] = keys[Math.min(i, keys.length - 1)] ?? keys[0]!;
  // Walking is a gallop: the rider rises and sinks with the stride.
  const bounce = anim === 'walk' ? 0.8 * Math.sin((Math.PI * 2 * i) / 6 + 1.4) : anim === 'idle' ? i * 0.3 : 0;
  const bob: V3 = [0, 0, bounce];
  const plus = (v: V3): V3 => [v[0] + bob[0], v[1] + bob[1], v[2] + bob[2]];
  const flail = anim === 'death' ? i : 0;
  return {
    pelvis: plus(SEAT),
    lean: anim === 'death' ? -0.25 * flail : lean,
    twist,
    footL: STIRRUP_L,
    footR: STIRRUP_R,
    handL: flail ? [0, 9, 42] : plus(REIN_L),
    handR: flail ? [0, -9, 42] : plus(hand),
    mounted: true,
    weapon: { at: flail ? [0, -9, 42] : plus(hand), dir: norm(dir) },
  };
}
