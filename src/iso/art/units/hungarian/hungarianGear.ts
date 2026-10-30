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

/** Kalpag: a tall fur cylinder flaring to the crown, a team cloth bag drooping to the right, a heron plume at the front left. */
export function kalpag(fig: Figure, hc: V3, axes: Axes): void {
  const hp = (p: V3): V3 => at(hc, axes, p);
  fig.cone(hp([-0.2, 0, 0.6]), hp([-0.6, 0, 10.8]), 7.0, 7.8, H.fur);
  fig.sphere(hp([-0.6, 0, 10.0]), 7.3, H.fur, { n: axes[2], at: hp([-0.6, 0, 10.4]) });
  // The bag (zacskó): a team cloth top falling over the right side.
  fig.sphere(hp([-1.0, -1.4, 10.8]), 4.2, M.team, { n: axes[2], at: hp([0, 0, 10.2]) });
  fig.cone(hp([-1.2, -2.6, 12.0]), hp([-2.8, -8.6, 5.0]), 3.6, 1.9, M.team);
  fig.sphere(hp([-3.0, -8.8, 4.2]), 1.3, M.gold);
  // Heron plume in a gilt brooch, rising and leaning back.
  fig.sphere(hp([6.4, 2.6, 7.0]), 1.4, M.gold);
  fig.capsule(hp([5.8, 2.8, 8.0]), hp([3.4, 3.8, 17.2]), 1.25, H.plume);
  fig.capsule(hp([3.4, 3.8, 17.2]), hp([0.4, 4.4, 21.4]), 0.9, H.plume);
}

/** Mente: a team pelisse hung from the left shoulder down the back, its empty sleeve dangling, wolf fur round collar and hem. */
const mente: BackItemPainter = (fig, torso, T) => {
  const axes: Axes = [T.x, T.y, T.z];
  fig.ellipsoid(torso([-5.0, 2.6, 8.6]), axes, [1.7, 6.0, 6.8], M.team);
  fig.capsule(torso([-1.6, 8.6, 13.0]), torso([-3.2, 9.8, 3.8]), 2.2, M.team);
  fig.capsule(torso([-4.6, -3.4, 13.4]), torso([-0.6, 8.4, 14.0]), 1.8, H.fur);
  fig.capsule(torso([-5.6, -3.2, 2.4]), torso([-4.4, 8.0, 2.2]), 1.4, H.fur);
  fig.sphere(torso([-3.3, 9.9, 3.2]), 2.4, H.fur);
  fig.capsule(torso([-0.6, 8.4, 14.0]), torso([2.8, 3.0, 11.8]), 0.5, M.gold);
};

export const HUNGARIAN_HATS = { kalpag: { draw: kalpag, coversHead: false } } satisfies Record<string, HatDef>;

export const HUNGARIAN_BACK_ITEMS = { mente } satisfies Record<string, BackItemPainter>;
