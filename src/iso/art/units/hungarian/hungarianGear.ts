import type { Axes, Figure } from '../figure';
import type { BackItemPainter, HatDef } from '../gear';
import { M } from '../materials';
import { madd, type V3 } from '../rigMath';
import { HUNGARIAN_M } from './hungarianMaterials';

const H = HUNGARIAN_M;

/*
 * The hussar's gear (M8): the tall fur kalpag with its drooping team
 * bag and the heron plume pinned by a gilt brooch, and the fur-trimmed
 * team pelisse (mente) slung over the left shoulder. Registered in
 * gearRegistry.ts.
 */

/** Head-local point: hc + f·p0 + l·p1 + u·p2. */
const at = (hc: V3, [f, l, u]: Axes, p: V3): V3 => madd(madd(madd(hc, f, p[0]), l, p[1]), u, p[2]);

/**
 * Kalpag: a tall fur cylinder flaring wide to the crown, a long team
 * cloth bag falling from the crown down the right side to the shoulder
 * (the hat's lopsided outline), a heron plume pinned at the front left.
 */
export function kalpag(fig: Figure, hc: V3, axes: Axes): void {
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.cone(hp([-0.2, 0, 0.6]), hp([-0.6, 0, 10.6]), 7.0, 9.2, H.fur);
  fig.sphere(hp([-0.6, 0, 8.6]), 9.2, H.fur, { n: axes[2], at: hp([-0.6, 0, 10.4]) });
  // The bag (zacskó): team cloth over the crown, hanging down the right side.
  fig.sphere(hp([-1.0, -1.6, 9.6]), 5.4, M.team, { n: axes[2], at: hp([0, 0, 10.6]) });
  fig.cone(hp([-1.2, -4.6, 11.6]), hp([-2.2, -10.6, 2.2]), 4.4, 2.6, M.team);
  fig.cone(hp([-2.2, -10.6, 2.2]), hp([-2.6, -11.2, -2.0]), 2.6, 1.0, M.team);
  fig.sphere(hp([-2.7, -11.3, -2.6]), 1.5, M.gold);
  // Heron plume in a gilt brooch, rising tall and leaning back.
  fig.sphere(hp([7.4, 3.2, 6.6]), 1.5, M.gold);
  fig.capsule(hp([6.8, 3.4, 7.6]), hp([4.6, 4.6, 18.6]), 1.3, H.plume);
  fig.capsule(hp([4.6, 4.6, 18.6]), hp([1.2, 5.4, 24.4]), 0.95, H.plume);
}

/** Mente: a team pelisse hung from the left shoulder and swinging out past it, its empty sleeve dangling wide, wolf fur round collar and hem. */
const mente: BackItemPainter = (fig, torso, T) => {
  const axes: Axes = [T.x, T.y, T.z];
  fig.ellipsoid(torso([-4.8, 4.4, 8.4]), axes, [1.9, 7.0, 7.0], M.team);
  fig.capsule(torso([-2.0, 9.6, 13.2]), torso([-3.6, 12.4, 3.4]), 2.4, M.team);
  fig.capsule(torso([-4.6, -2.6, 13.6]), torso([-1.0, 9.6, 14.0]), 1.9, H.fur);
  fig.capsule(torso([-5.6, -2.4, 2.0]), torso([-4.4, 10.8, 1.8]), 1.5, H.fur);
  fig.sphere(torso([-3.7, 12.5, 2.8]), 2.6, H.fur);
  fig.capsule(torso([-1.0, 9.6, 14.0]), torso([2.8, 3.0, 11.8]), 0.5, M.gold);
};

export const HUNGARIAN_HATS = { kalpag: { draw: kalpag, coversHead: false } } satisfies Record<string, HatDef>;

export const HUNGARIAN_BACK_ITEMS = { mente } satisfies Record<string, BackItemPainter>;
