import { axesAlong, type Axes, type Figure } from './figure';
import type { UnitAnim } from './layout';
import { M, type Material } from './materials';
import { applyPoint, compose, madd, norm, rotationAbout, translation, type V3, type Xform } from './rigMath';

export interface HorseLook {
  readonly coat: Material;
  readonly mane: Material;
  /** Full team caparison + steel chanfron (knight). */
  readonly barding?: boolean;
  /** Team saddle cloth on the flanks. */
  readonly saddleCloth?: boolean;
}

const TAU = Math.PI * 2;
const UPPER = 8.8;
const LOWER = 9.6;

interface LegState {
  /** Upper leg angle from vertical, + = forward. */
  swing: number;
  /** Lower leg fold (rad, the hoof tucks back). */
  fold: number;
}

/** Leg angles for a phase q ∈ [0, 1): stance sweep then a tucked return. */
function gallopLeg(q: number): LegState {
  const stance = 0.42;
  if (q < stance) return { swing: 0.5 - (q / stance) * 1.05, fold: 0.1 };
  const t = (q - stance) / (1 - stance);
  return { swing: -0.55 + t * 1.05, fold: 0.15 + Math.sin(Math.PI * t) * 1.45 };
}

interface HorsePose {
  body: Xform;
  legs: [LegState, LegState, LegState, LegState];
  headDip: number;
  tail: number;
}

const STAND: LegState = { swing: 0, fold: 0.05 };

function horsePose(anim: UnitAnim, i: number): HorsePose {
  const pivot: V3 = [0, 0, 22];
  if (anim === 'walk') {
    const p = i / 6;
    // Front pair lands after the hind pair (transverse gallop).
    const legs = [0.5, 0.62, 0.0, 0.1].map((o) => gallopLeg((p + o) % 1)) as HorsePose['legs'];
    const pitch = 0.07 * Math.cos(TAU * p);
    const bob = 1.3 * Math.sin(TAU * p + 0.6);
    return { body: compose(translation([0, 0, bob]), rotationAbout(pivot, [0, 1, 0], pitch)), legs, headDip: 0.12 * Math.sin(TAU * p), tail: Math.sin(TAU * p) };
  }
  if (anim === 'attack') {
    const rear = [0, 0.04, 0.09, 0.06, 0.02][i] ?? 0;
    const paw: LegState = { swing: 0.35 * (rear / 0.09), fold: 0.9 * (rear / 0.09) };
    return {
      body: rotationAbout([-10, 0, 20], [0, 1, 0], -rear),
      legs: [paw, STAND, STAND, STAND],
      headDip: -rear * 2,
      tail: 0.3,
    };
  }
  if (anim === 'death') {
    const fold: LegState = { swing: 0.6, fold: 1.4 * (i / 3) };
    const legs = [fold, fold, { swing: -0.5, fold: 1.2 * (i / 3) }, { swing: -0.4, fold: 1.0 * (i / 3) }] as HorsePose['legs'];
    return { body: IDENTITY_POSE, legs, headDip: 0.3 * i, tail: -0.5 };
  }
  return { body: IDENTITY_POSE, legs: [STAND, STAND, STAND, STAND], headDip: i * 0.06, tail: i ? 0.4 : -0.2 };
}

const IDENTITY_POSE: Xform = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1], t: [0, 0, 0] };

/** Death roll onto the horse's left side (whole mount + rider). */
export function horseFall(i: number): Xform {
  const roll = [0.12, 0.55, 1.15, 1.42][i] ?? 0;
  return rotationAbout([0, 7, 0], [1, 0, 0], -roll);
}

/** Paints the horse; returns the body transform the rider sits in. */
export function drawHorse(fig: Figure, look: HorseLook, anim: UnitAnim, i: number): Xform {
  const hp = horsePose(anim, i);
  const B = hp.body;
  const at = (p: V3): V3 => applyPoint(B, p);
  const bAxes: Axes = [B.x, B.y, B.z];
  const coat = look.coat;

  // Legs first: tops ride with the body, angles are taken from vertical.
  const tops: V3[] = [[9.6, 3.5, 19.5], [9.6, -3.5, 19.5], [-10.4, 3.6, 20.5], [-10.4, -3.6, 20.5]];
  tops.forEach((top, k) => {
    const s = hp.legs[k] ?? STAND;
    const a = at(top);
    const knee = madd(a, [Math.sin(s.swing), 0, -Math.cos(s.swing)], UPPER);
    const lowAngle = s.swing - s.fold;
    const hoof = madd(knee, [Math.sin(lowAngle), 0, -Math.cos(lowAngle)], LOWER);
    fig.capsule(a, knee, k < 2 ? 2.2 : 2.6, coat);
    fig.capsule(knee, hoof, 1.35, coat);
    fig.cone(madd(hoof, [0, 0, 1], 0.4), madd(hoof, [0, 0, 1], -1.3), 1.6, 1.85, M.horse.hoof);
  });

  fig.ellipsoid(at([0, 0, 22]), bAxes, [13.2, 5.9, 6.5], coat);
  fig.ellipsoid(at([9.6, 0, 22.8]), bAxes, [6.4, 5.5, 6.8], coat);
  fig.ellipsoid(at([-9.6, 0, 23.4]), bAxes, [7.2, 6.0, 6.9], coat);

  // Neck and head (dipping with the stride).
  const neckBase = at([11.4, 0, 25.6]);
  const dip = hp.headDip;
  const poll = at([16.8 + dip * 4, 0, 34.8 - dip * 6]);
  fig.cone(neckBase, poll, 4.5, 2.9, look.barding ? M.team : coat);
  fig.capsule(at([10.4, 0, 29.8]), madd(poll, B.z, 2.4), 1.55, look.mane);
  const headDir = norm([0.68 + dip * 0.3, 0, -0.73 - dip * 0.2]);
  const headAxes = axesAlong(headDir, [0, 1, 0]);
  const headC = madd(poll, headDir, 4.6);
  fig.ellipsoid(headC, headAxes, [5.4, 2.55, 2.85], coat);
  fig.sphere(madd(poll, headDir, 9.4), 2.35, coat);
  for (const s of [1, -1]) {
    fig.cone(madd(madd(poll, B.y, s * 1.3), B.z, 1.2), madd(madd(poll, B.y, s * 1.6), B.z, 4.4), 0.95, 0.1, coat);
    fig.sphere(madd(madd(poll, headDir, 2.6), B.y, s * 2.25), 0.75, M.eye);
  }
  if (look.barding) {
    fig.ellipsoid(madd(headC, headDir, 0.6), headAxes, [4.9, 2.85, 3.05], M.steel, { n: headDir, at: madd(headC, headDir, -2.4) });
  }

  // Tail.
  const t0 = at([-16.4, 0, 26.2]);
  const t1 = at([-20.4, hp.tail * 1.2, 19.6]);
  const t2 = at([-21.2, hp.tail * 2.4, 11.2]);
  fig.capsule(t0, t1, 1.9, look.mane);
  fig.capsule(t1, t2, 1.55, look.mane);

  // Tack.
  if (look.barding) {
    fig.ellipsoid(at([0, 0, 21.6]), bAxes, [15.6, 6.55, 8.9], TEAM_CAPARISON, { n: B.z, at: at([0, 0, 12.8]) });
  } else if (look.saddleCloth) {
    fig.ellipsoid(at([-1.3, 0, 24.4]), bAxes, [7.2, 6.25, 5.4], TEAM_CLOTH, { n: B.z, at: at([0, 0, 20.2]) });
  }
  fig.ellipsoid(at([-1, 0, 28.3]), bAxes, [5.4, 6.3, 1.7], M.leather);
  fig.capsule(at([-1, 6.3, 27.5]), at([2.6, 7.4, 18.8]), 0.4, M.darkLeather);
  fig.capsule(at([-1, -6.3, 27.5]), at([2.6, -7.4, 18.8]), 0.4, M.darkLeather);
  return B;
}

const TEAM_CAPARISON: Material = { color: 0xffffff, team: true, bands: { count: 1, color: 0xe8c35a, width: 0.09 } };
const TEAM_CLOTH: Material = { color: 0xffffff, team: true, bands: { count: 1, color: 0xe8c35a, width: 0.14 } };

/** Where the horse's bit is (reins end), in the body frame. */
export function bitPoint(B: Xform, anim: UnitAnim, i: number): V3 {
  const dip = horsePose(anim, i).headDip;
  return applyPoint(B, [24.6 + dip * 4, 0, 29.6 - dip * 8]);
}
