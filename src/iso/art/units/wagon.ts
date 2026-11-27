import type { Figure } from './figure';
import { drawHorse, horseFall, type HorseLook } from './horse';
import type { UnitAnim } from './layout';
import { M, type Material } from './materials';
import { add, applyPoint, compose, IDENTITY, rotate, rotationAbout, translation, type V3, type Xform } from './rigMath';

/**
 * The trade cart (M17): a horse in harness drawing a two-wheeled covered
 * wagon. Forward = +x (the horse's head). The canvas cover is team colour
 * on wooden hoops; the bed's wood and its painted trim come from the civ's
 * palette (tradeCartLook), the tyres and fittings are iron.
 */
export interface WagonLook {
  readonly wood?: Material;
  readonly trim?: Material;
  readonly horse?: HorseLook;
}

/** Where the horse stands (its body origin) and where the cart's axle is, rig px along x. */
const HORSE_X = 13;
const CART_X = -27;
const WHEEL_R = 10;
const SPOKES = 10;
/** Bed: half length / half width / top height. */
const BED_LEN = 14.5;
const BED_W = 7;
const BED_TOP = 14;
/** The cover's hoop radius and the height of its axis above the bed top. */
const COVER_R = 9;
const COVER_LIFT = 4;
const COVER_BACK = CART_X - 9.5;
const COVER_FRONT = CART_X + 12;

const AXES: [V3, V3, V3] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/** Team canvas on four wooden hoops. */
const CANVAS: Material = { color: 0xffffff, team: true, bands: { count: 4, color: 0x5a3a22, width: 0.07 } };
const SHADE: Material = { color: 0x241a12 };
const SACK: Material = { color: 0xcdb98e };
const SACK_DARK: Material = { color: 0xb09a6c };
const DEFAULT_HORSE: HorseLook = { coat: M.horse.bay, mane: M.horse.mane };

/** Death: the cart tips onto its left side (toward +y, as the horse falls). */
function cartTip(i: number): Xform {
  const k = [0.1, 0.42, 0.85, 1][i] ?? 1;
  return rotationAbout([CART_X, BED_W + 2.4, 0], [1, 0, 0], -1.25 * k);
}

/** The whole team: horse, harness and shafts, the cart with its wheels, cover and load. */
export function drawWagon(fig: Figure, look: WagonLook, anim: UnitAnim, i: number): void {
  const wood = look.wood ?? M.wood;
  const trim = look.trim ?? M.darkWood;
  const dying = anim === 'death';

  // The horse (idle: breathing and a head bob; walk: its gait), placed ahead of the cart.
  const horseAt: Xform = compose(dying ? horseFall(i) : IDENTITY, translation([HORSE_X, 0, 0]));
  fig.place(horseAt);
  const B = drawHorse(fig, look.horse ?? DEFAULT_HORSE, anim, i);
  const onHorse = (p: V3): V3 => applyPoint(B, p);
  // Collar round the neck base and a breeching strap over the croup.
  fig.ellipsoid(onHorse([11.6, 0, 26]), [B.x, B.y, B.z], [2.4, 5.6, 5.2], M.darkLeather, { n: [-1, 0, 0.2], at: onHorse([11.2, 0, 26]) });
  fig.capsule(onHorse([10.6, 5.2, 22]), onHorse([-12, 5.6, 22.5]), 0.45, M.darkLeather);
  fig.capsule(onHorse([10.6, -5.2, 22]), onHorse([-12, -5.6, 22.5]), 0.45, M.darkLeather);
  fig.capsule(onHorse([-12, 5.6, 22.5]), onHorse([-14, 0, 27.5]), 0.45, M.darkLeather);
  fig.capsule(onHorse([-12, -5.6, 22.5]), onHorse([-14, 0, 27.5]), 0.45, M.darkLeather);
  for (const s of [1, -1]) fig.sphere(onHorse([11.8, s * 5.4, 27.6]), 0.8, M.brass);
  // Where the shafts are tugged along (rig space, standing pose: the shafts ride with the cart).
  const tug = (s: number): V3 => applyPoint(horseAt, onHorse([6, s * 6.2, 21.5]));

  // The cart: rolls a little on the walk, tips over in death.
  const roll = anim === 'walk' ? (i / 6) * ((Math.PI * 2) / SPOKES) : 0;
  const bump = anim === 'walk' ? 0.35 * Math.abs(Math.sin((Math.PI * 2 * i) / 6)) : 0;
  const sway = anim === 'walk' ? 0.025 * Math.sin((Math.PI * 2 * i) / 6) : 0;
  const C: Xform = compose(translation([0, 0, bump]), rotationAbout([CART_X, 0, WHEEL_R], [1, 0, 0], sway));
  fig.place(dying ? cartTip(i) : IDENTITY);
  const at = (p: V3): V3 => applyPoint(C, p);

  // Shafts from the bed's front corners to the horse's flanks (they stay with the cart when it tips).
  const shaftEnd = (s: number): V3 => (dying ? at([HORSE_X + 6, s * 6.2, 12]) : tug(s));
  for (const s of [1, -1]) {
    fig.capsule(at([CART_X + BED_LEN - 3, s * (BED_W - 0.6), BED_TOP - 1.4]), shaftEnd(s), 0.75, wood);
  }

  // Bed: a plank floor, side boards with the civ's painted trim, an iron-banded tailboard.
  fig.box(at([CART_X, 0, BED_TOP - 1.6]), AXES, [BED_LEN, BED_W, 1.1], wood);
  for (const s of [1, -1]) {
    fig.box(at([CART_X, s * BED_W, BED_TOP + 0.6]), AXES, [BED_LEN, 0.55, 1.5], wood);
    fig.box(at([CART_X, s * (BED_W + 0.35), BED_TOP + 1.25]), AXES, [BED_LEN - 0.6, 0.25, 0.5], trim);
  }
  fig.box(at([CART_X - BED_LEN, 0, BED_TOP + 0.4]), AXES, [0.6, BED_W, 1.7], wood);
  fig.box(at([CART_X - BED_LEN - 0.3, 0, BED_TOP + 0.4]), AXES, [0.2, BED_W, 0.35], M.iron);
  // The driver's bench at the front.
  fig.box(at([CART_X + BED_LEN - 1.5, 0, BED_TOP + 2.6]), AXES, [1.4, BED_W - 0.4, 0.5], wood);
  fig.box(at([CART_X + BED_LEN, 0, BED_TOP + 1.2]), AXES, [0.5, BED_W, 1.5], wood);
  // Axle under the bed.
  fig.box(at([CART_X, 0, WHEEL_R]), AXES, [1.0, BED_W + 1.6, 0.9], M.darkWood);

  // The canvas cover: a half cylinder on hoops, its back end open (shade inside).
  const zc = BED_TOP + COVER_LIFT;
  const above = { n: [0, 0, 1] as V3, at: at([0, 0, BED_TOP + 0.3]) };
  fig.cone(at([COVER_BACK, 0, zc]), at([COVER_FRONT, 0, zc]), COVER_R, COVER_R, CANVAS, above);
  fig.ellipsoid(at([COVER_BACK - 0.05, 0, zc]), AXES, [0.25, COVER_R * 0.78, COVER_R * 0.78], SHADE, { n: [0, 0, 1], at: at([0, 0, BED_TOP + 0.6]) });
  fig.ellipsoid(at([COVER_FRONT + 0.05, 0, zc]), AXES, [0.25, COVER_R * 0.72, COVER_R * 0.72], SHADE, { n: [0, 0, 1], at: at([0, 0, BED_TOP + 0.6]) });

  // The load at the open back: a crate, a barrel and grain sacks.
  fig.box(at([CART_X - BED_LEN + 2.2, 2.4, BED_TOP + 1.7]), AXES, [1.7, 1.8, 1.7], wood);
  fig.box(at([CART_X - BED_LEN + 2.2, 2.4, BED_TOP + 3.45]), AXES, [1.75, 1.85, 0.12], M.darkWood);
  fig.cone(at([CART_X - BED_LEN + 2.4, -2.6, BED_TOP]), at([CART_X - BED_LEN + 2.4, -2.6, BED_TOP + 4.2]), 1.7, 1.7, { color: 0x7a4e2c, bands: { count: 2, color: 0x3c3c40, width: 0.12 } });
  fig.ellipsoid(at([CART_X - BED_LEN + 4.6, 0, BED_TOP + 1.6]), AXES, [1.6, 2.2, 1.7], SACK);
  fig.ellipsoid(at([CART_X - BED_LEN + 4.4, -0.6, BED_TOP + 3.4]), AXES, [1.4, 1.9, 1.3], SACK_DARK);

  // Two big spoked wheels: iron tyres on wooden felloes, turning on the walk.
  for (const s of [1, -1]) {
    const hub = at([CART_X, s * (BED_W + 2.2), WHEEL_R]);
    const ax: V3 = [0, s, 0];
    const rim = (a: number, r = WHEEL_R): V3 => add(hub, rotate([r, 0, 0], ax, a * s));
    const N = 16;
    for (let k = 0; k < N; k++) {
      const a0 = (k / N) * Math.PI * 2;
      const a1 = ((k + 1) / N) * Math.PI * 2;
      fig.capsule(rim(a0), rim(a1), 0.95, M.iron);
      fig.capsule(rim(a0, WHEEL_R - 1.1), rim(a1, WHEEL_R - 1.1), 0.7, wood);
    }
    for (let k = 0; k < SPOKES; k++) fig.capsule(hub, rim(roll + (k / SPOKES) * Math.PI * 2, WHEEL_R - 1.2), 0.42, wood);
    fig.cone(add(hub, [0, -s * 1.2, 0]), add(hub, [0, s * 1.5, 0]), 1.7, 1.3, M.iron);
  }
}

/** A civ's trade cart look: its wood and trim colours (the ships' palette), and its horse. */
export function tradeCartLook(wood: number, trim: number, horse: HorseLook = DEFAULT_HORSE) {
  return { kind: 'wagon' as const, wagon: { wood: { color: wood }, trim: { color: trim }, horse } };
}
