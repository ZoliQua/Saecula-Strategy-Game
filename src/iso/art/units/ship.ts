import type { Figure } from './figure';
import type { UnitAnim } from './layout';
import { M, type Material } from './materials';
import { applyPoint, compose, rotationAbout, translation, type V3, type Xform } from './rigMath';

/** The four ships (M14); the painter shapes the hull and rigging from the kind. */
export type ShipKind = 'fishing' | 'transport' | 'galley' | 'frigate';

/** A ship's look: the hull wood and a trim colour (the civ's palette); sails are team colour. */
export interface ShipLook {
  readonly ship: ShipKind;
  readonly wood?: Material;
  readonly trim?: Material;
}

interface HullSpec {
  /** Half length (bow to stern) and half beam (width), art px at rig scale. */
  readonly len: number;
  readonly beam: number;
  /** Freeboard height above the water line. */
  readonly height: number;
  readonly masts: readonly { readonly x: number; readonly h: number; readonly sail: number }[];
}

const HULLS: Readonly<Record<ShipKind, HullSpec>> = {
  fishing: { len: 17, beam: 6, height: 3.4, masts: [{ x: 1, h: 19, sail: 6.5 }] },
  transport: { len: 18, beam: 7.5, height: 4.4, masts: [{ x: 0, h: 24, sail: 9.5 }] },
  galley: { len: 22, beam: 6, height: 3.6, masts: [{ x: 2, h: 22, sail: 8.5 }] },
  frigate: {
    len: 25,
    beam: 8,
    height: 6,
    masts: [
      { x: 9, h: 27, sail: 8 },
      { x: -1, h: 31, sail: 9.5 },
      { x: -11, h: 25, sail: 7.5 },
    ],
  },
};

const SPRAY: Material = { color: 0xe8eef2 };
const SMOKE: Material = { color: 0xe4e0d8 };
const NET: Material = { color: 0xcfc4a0 };

const AXES = (): [V3, V3, V3] => [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/** Rocking on the swell: idle and sailing bob; sailing heels a little more. */
function swell(anim: UnitAnim, i: number): Xform {
  const n = anim === 'walk' ? 6 : 2;
  const t = (Math.PI * 2 * i) / n;
  const bob = anim === 'walk' ? 0.6 * Math.sin(t) : 0.3 * Math.sin(t);
  const roll = anim === 'walk' ? 0.05 * Math.sin(t) : 0.02 * Math.sin(t);
  return compose(translation([0, 0, bob]), rotationAbout([0, 0, 0], [1, 0, 0], roll));
}

/** Death: the ship lists to one side and settles below the water line. */
export function shipSink(i: number): Xform {
  const k = [0.15, 0.4, 0.7, 1][i] ?? 1;
  return compose(translation([0, 0, -9 * k]), rotationAbout([0, 0, 0], [1, 0, 0], 0.45 * k));
}

/** A ship (forward = bow, +x): hull, deck, masts with team-colour sails and the kind's fittings. */
export function drawShip(fig: Figure, look: ShipLook, anim: UnitAnim, i: number): void {
  const spec = HULLS[look.ship];
  const wood = look.wood ?? M.wood;
  const trim = look.trim ?? M.darkWood;
  const S = anim === 'death' ? shipSink(i) : swell(anim, i);
  const at = (p: V3): V3 => applyPoint(S, p);
  const { len, beam, height } = spec;
  const axes = AXES();

  // Hull: a keel block, two tapering sides and a pointed bow, the trim along the gunwale.
  fig.box(at([0, 0, height * 0.45]), axes, [len * 0.82, beam * 0.78, height * 0.5], wood);
  for (const s of [1, -1]) {
    fig.box(at([-len * 0.05, s * beam * 0.82, height * 0.62]), axes, [len * 0.78, 0.7, height * 0.42], wood);
    fig.box(at([-len * 0.05, s * beam * 0.86, height * 1.05]), axes, [len * 0.8, 0.55, 0.45], trim);
  }
  fig.cone(at([len * 0.7, 0, height * 0.55]), at([len * 1.12, 0, height * 0.95]), beam * 0.78, 0.6, wood);
  fig.box(at([-len * 0.86, 0, height * 0.75]), axes, [1.4, beam * 0.8, height * 0.62], trim);
  fig.box(at([0, 0, height * 0.98]), axes, [len * 0.78, beam * 0.72, 0.25], M.darkWood);
  if (look.ship === 'frigate') {
    // Raised quarterdeck and a row of gun ports on each side.
    fig.box(at([-len * 0.62, 0, height * 1.35]), axes, [len * 0.28, beam * 0.78, height * 0.35], wood);
    for (const s of [1, -1]) {
      for (let k = 0; k < 4; k++) fig.box(at([len * (0.45 - k * 0.28), s * beam * 0.88, height * 0.62]), axes, [0.9, 0.3, 0.7], M.black);
    }
  }

  // Masts and sails (team colour); the frigate's foremost sail sits lower.
  for (const mast of spec.masts) {
    const foot = at([mast.x, 0, height]);
    const top = at([mast.x, 0, height + mast.h]);
    fig.capsule(foot, top, 0.65, M.darkWood);
    const yardZ = height + mast.h * 0.86;
    fig.capsule(at([mast.x, -mast.sail * 1.05, yardZ]), at([mast.x, mast.sail * 1.05, yardZ]), 0.35, M.darkWood);
    const belly = anim === 'walk' ? 1.6 : 0.9;
    fig.box(at([mast.x + belly, 0, yardZ - mast.sail * 0.62]), axes, [0.35, mast.sail, mast.sail * 0.6], M.team);
  }

  if (look.ship === 'galley') {
    // Oars: a bank on each side, swept on the sailing frames.
    const sweep = anim === 'walk' ? Math.sin((Math.PI * 2 * i) / 6) * 3 : 0;
    for (const s of [1, -1]) {
      for (let k = 0; k < 5; k++) {
        const x = len * (0.5 - k * 0.24);
        fig.capsule(at([x, s * beam * 0.9, height * 0.9]), at([x - 1.5 + sweep, s * (beam + 7), 0.2]), 0.3, wood);
      }
    }
    // A ram at the bow.
    fig.cone(at([len * 1.0, 0, 0.8]), at([len * 1.28, 0, 0.6]), 1.1, 0.4, M.bronze);
  }
  if (look.ship === 'fishing' && anim === 'work') {
    // The net hauled over the side.
    const haul = [0.2, 0.6, 1, 0.6][i] ?? 0;
    fig.capsule(at([-2, beam * 0.9, height]), at([-3, beam + 5, height * (0.4 + haul)]), 0.3, M.string);
    fig.ellipsoid(at([-3, beam + 6, height * (0.2 + haul * 0.8)]), axes, [3, 2.4, 1.6], NET);
  }
  if (look.ship === 'transport') {
    // Cargo: barrels and crates amidships.
    fig.box(at([len * 0.3, 0, height * 1.35]), axes, [2.6, 2.6, 1.6], M.wood);
    fig.capsule(at([-len * 0.35, -2.4, height * 1.35]), at([-len * 0.35, -2.4, height * 1.95]), 1.6, M.darkWood);
  }

  if (anim === 'attack' && (i === 2 || i === 3)) {
    // A flash of smoke at the bow (galley's bolt) or a broadside puff (frigate).
    const k = i === 2 ? 1 : 1.4;
    const side = look.ship === 'frigate';
    const m = at(side ? [0, beam + 4 * k, height * 0.7] : [len * 1.15, 0, height * 1.2]);
    fig.sphere(m, (side ? 4.2 : 2.2) * k, SMOKE);
    fig.sphere([m[0] + 1.5, m[1], m[2] + 1.2], (side ? 3.2 : 1.6) * k, SMOKE);
  }
  if (anim === 'walk') {
    // Bow spray.
    fig.sphere(at([len * 1.05, 0, 0.4]), 1.6, SPRAY);
  }
}

/** The four ship looks in one civ's palette: hull wood and trim colours (sails stay team colour). */
export function shipFleet(wood: number, trim: number) {
  const look = (ship: ShipKind) => ({ kind: 'ship' as const, ship: { ship, wood: { color: wood }, trim: { color: trim } } });
  const transport = look('transport');
  return {
    fishing_boat: look('fishing'),
    transport,
    galley: look('galley'),
    frigate: look('frigate'),
    // M17: the trade ship shares the transport's sheet, so it wears the very same look.
    trade_ship: transport,
  };
}
