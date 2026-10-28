import { R } from '../../architecture/facade';
import { swallowtailCrown } from '../../architecture/kits/swallowtail';
import { octPrism, tentRoof } from '../../architecture/kits/tentRoof';
import { RUSSIAN_MUSCOVY } from '../../architecture/russian/russianStyles';
import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { forkedMerlon, type MerlonSize } from '../kits/forkedMerlon';
import { armShadow, frontEdge, padShadow } from '../kits/wallParts';
import { prism } from '../prism';
import { stations, type WallAgeStyle } from '../wallKit';
import { armDir, loopholes } from './russianWallParts';

/*
 * Russian age-3 wall: a whitewashed brick kremlin (Moscow, as the
 * eighteenth century limed it). A white-stone plinth, a lime-white
 * curtain with small arrow slits, forked merlons; square white towers
 * corbelled out at the top under a forked parapet, an octagon and a
 * tall green-glazed tent — the green tents are the
 * skyline cue (the Italian brick swallowtails stay red and tentless).
 */

/** Lime-white of the walls; a greyer white stone for the plinth and bands. */
const LIME = 0xf1ede3;
const WHITE_STONE = 0xd6d0c1;
const WALK = shade(LIME, 0.78);
/** Green glazed tiles of the tents (the Muscovite tower roofs). */
const GREEN = RUSSIAN_MUSCOVY.palette.roofAlt;

/** Wall-walk of the kremlin curtain: the merlons stand on it. */
export const KREMLIN_WALK = 48;
const HALF = 0.18;
/** Tall merlons with a moderate fork, white with grey notch copings (the Italian forks are wide, red and dark-notched). */
const MERLON: MerlonSize = { width: 0.19, thick: 0.07, body: 12, horn: 9 };
const NOTCH = shade(LIME, 0.5);

/** Rise of the towers' green tents (art px). */
export const KREMLIN_TENT = 62;
const SHAFT = [0.2, 0.2, 0.8, 0.8] as const;
const SHAFT_TOP = 80;
const PLATFORM = [0.16, 0.16, 0.84, 0.84] as const;
const PLATFORM_Z = SHAFT_TOP + 8;
const OCT_Z = PLATFORM_Z + 18;
const OCT_R = 0.21;

/** Curtain face: a faint brick ghost through the lime, slits below the walk. */
function curtainFace(ctx: Ctx, w: number, h: number, light: number): void {
  ctx.fillStyle = css(shade(LIME, light * 0.86), 0.35);
  for (let y = 6; y < h; y += 10) ctx.fillRect(0, -y, w, 0.7);
  loopholes(ctx, w, -h + 12, 9, 30, light);
}

/** Tower face: two tiers of slit windows in white-stone frames. */
const towerFace = (p: IsoPainter, light: number) => (w: number, h: number) => {
  const ctx = p.ctx;
  for (const y of [h * 0.35, h * 0.75]) {
    ctx.fillStyle = css(shade(WHITE_STONE, light));
    ctx.fillRect(w / 2 - 4, -y - 13, 8, 14);
    ctx.fillStyle = css(shade(0x1e1812, light));
    ctx.fillRect(w / 2 - 1.5, -y - 10, 3, 9);
  }
};

const CROWN = { color: LIME, cap: shade(LIME, 0.9), parapet: 4, body: 7, horn: 5, width: 0.12, gap: 0.07, thickness: 0.05 };

/** Age 3 (Felvilágosodás): whitewashed brick kremlin, forked merlons; white towers under green tents. */
export const KREMLIN: WallAgeStyle = {
  readback: true,
  postHalf: 0.3,
  postTop: OCT_Z + KREMLIN_TENT,
  shadow: (p, arm) => armShadow(p, arm, 0.22 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    prism(p, arm.a, arm.b, (HALF + 0.03) * g, 0, 10, { color: WHITE_STONE, detail: 'stone', batter: 0.02 });
    prism(p, arm.a, arm.b, HALF * g, 10, KREMLIN_WALK, { color: LIME, top: WALK, face: (w, h, l) => curtainFace(p.ctx, w, h, l) });
    const d = armDir(arm);
    const m = { ...MERLON, thick: MERLON.thick * g };
    for (const c of stations(arm, 0.3, 0.06)) {
      forkedMerlon(p, frontEdge(arm, c, HALF * g - m.thick / 2), d, KREMLIN_WALK, m, LIME, NOTCH);
    }
  },
  post: (p) => {
    padShadow(p, 0.35);
    p.box(0.17, 0.17, 0.83, 0.83, 0, 12, { color: WHITE_STONE, detail: 'stone' }, WHITE_STONE);
    p.box(...SHAFT, 12, SHAFT_TOP, { color: LIME }, WALK);
    p.leftFace(SHAFT[0], SHAFT[2], SHAFT[3], 12, towerFace(p, 1), SHAFT_TOP - 12);
    p.rightFace(SHAFT[1], SHAFT[3], SHAFT[2], 12, towerFace(p, R), SHAFT_TOP - 12);
    // Corbelled machicolation band carrying the forked parapet.
    p.box(...PLATFORM, SHAFT_TOP, PLATFORM_Z, { color: WHITE_STONE }, WALK);
    const slots = (w: number) => {
      p.ctx.fillStyle = '#2a221c';
      for (let x = 5; x < w - 3; x += 9) p.ctx.fillRect(x, -3, 3, 3);
    };
    p.leftFace(PLATFORM[0], PLATFORM[2], PLATFORM[3], SHAFT_TOP, slots, 8);
    p.rightFace(PLATFORM[1], PLATFORM[3], PLATFORM[2], SHAFT_TOP, slots, 8);
    swallowtailCrown(p, ...PLATFORM, PLATFORM_Z, 'back', CROWN);
    p.box(0.27, 0.27, 0.73, 0.73, PLATFORM_Z, OCT_Z - 6, { color: LIME }, WALK);
    octPrism(p, 0.5, 0.5, OCT_R, OCT_Z - 6, OCT_Z, LIME, 'plain');
    swallowtailCrown(p, ...PLATFORM, PLATFORM_Z, 'front', CROWN);
    tentRoof(p, 0.5, 0.5, OCT_R, OCT_Z, KREMLIN_TENT, GREEN, { material: 'tile', eave: 0.04, ribs: shade(GREEN, 1.35), lights: true });
  },
};
