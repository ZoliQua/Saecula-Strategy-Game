import type { WallStyleId } from '../../../../config/civs';
import { GERMAN_BACKSTEIN, GERMAN_FACHWERK, GERMAN_LIMES } from '../../architecture/german/germanStyles';
import { styleFraming } from '../../architecture/kits/halfTimber';
import { needleSpire } from '../../architecture/kits/needleSpire';
import { post as timberPost } from '../../architecture/parts';
import type { Ctx } from '../../canvas';
import { R } from '../../architecture/facade';
import { css, shade } from '../../palette';
import { bankPalisadeArm, bankPalisadeShadow, reachBody } from '../kits/bankPalisade';
import { starFortWall } from '../kits/starFort';
import { armShadow, padShadow } from '../kits/wallParts';
import { prism } from '../prism';
import { along, stations, type WallAgeStyle } from '../wallKit';
import { blindNiche, nicheFrieze, slit } from './germanWallParts';

/*
 * German walls (M5), one character per age, matched to the German
 * towers and palettes: the Limes — an oak palisade on its bank with
 * square timber-framed watchtowers on sandstone footings under steep
 * shingle pyramids; a North German Backstein curtain on a fieldstone
 * plinth with a white blind-niche frieze, its square brick piers capped
 * by slate needle spires; and a star-fort trace (the shared kit) in red
 * Main sandstone with cream dressings and needle-capped guérites.
 */

const L = GERMAN_LIMES.palette;
const F = GERMAN_FACHWERK.palette;
const B = GERMAN_BACKSTEIN.palette;

const BANK = 0x655137;
const TURF = 0x5a7a34;
/** Split oak of the Limes palisade, darker and redder than the English oak. */
const OAK = 0x684731;

/** Height (art px) of the Limes watchtower's roof apex: the post's top, where its hip roof ends. */
const LIMES_TOWER_TOP = 120;

/** Age 1 (Római kor): Limes palisade on its bank; square timber-framed watchtowers on sandstone footings. */
const LIMES_PALISADE: WallAgeStyle = {
  readback: true,
  postBody: 0.24,
  armStart: reachBody(0.24),
  postHalf: 0.3,
  postTop: LIMES_TOWER_TOP,
  shadow: bankPalisadeShadow,
  arm: (p, arm) => bankPalisadeArm(p, arm, { bank: BANK, turf: TURF, timber: OAK }),
  post: (p) => {
    padShadow(p, 0.32);
    p.box(0.18, 0.18, 0.82, 0.82, 0, 12, { color: shade(L.ashlar, 0.88), detail: 'stone' }, L.ashlar);
    p.box(0.24, 0.24, 0.76, 0.76, 12, 58, { color: L.plaster, detail: 'plaster' });
    const storey = (light: number) => (w: number, h: number) => {
      styleFraming(p.ctx, GERMAN_LIMES, w, h, 'square', light);
      slit(p.ctx, w / 2, -h + 16, 9);
    };
    p.leftFace(0.24, 0.76, 0.76, 12, storey(1), 46);
    p.rightFace(0.24, 0.76, 0.76, 12, storey(R), 46);
    // Gallery: a plank floor jutting on its joists, breastwork round the lookout, corner posts under the cap.
    const z = 58;
    const planks = { color: L.board, detail: 'planks' } as const;
    p.box(0.14, 0.14, 0.86, 0.86, z, z + 4, planks, L.board);
    const t = 0.05;
    for (const [a, b, e, f] of [[0.14, 0.14, 0.86, 0.14 + t], [0.14, 0.14, 0.14 + t, 0.86]] as const) p.box(a, b, e, f, z + 4, z + 13, planks, L.board);
    p.box(0.3, 0.3, 0.7, 0.7, z + 4, z + 14, { color: shade(L.board, 0.6) });
    for (const [a, b, e, f] of [[0.14, 0.86 - t, 0.86, 0.86], [0.86 - t, 0.14, 0.86, 0.86]] as const) p.box(a, b, e, f, z + 4, z + 13, planks, L.board);
    const cap = z + 30;
    for (const [u, v] of [[0.17, 0.17], [0.83, 0.17], [0.17, 0.83], [0.83, 0.83]] as const) timberPost(p, u, v, z + 13, cap, 2.2, L.timber);
    p.material = 'shingle';
    p.hipRoof(0.1, 0.1, 0.9, 0.9, cap, LIMES_TOWER_TOP - cap, L.roof, 0.04);
  },
};

const FIELDSTONE = 0x8c857a;
const BRICK = B.brick;
const PLASTER = B.plaster;
const WALK = shade(BRICK, 0.7);
const SLATE = F.roofAlt;
/** Muted limestone coping on the merlons (a pale top would read as a paved strip from afar). */
const COPING = shade(PLASTER, 0.72);

/** Curtain face: weathering at the foot, slits at intervals, the blind-niche frieze under the parapet. */
function curtainFace(ctx: Ctx, w: number, h: number, light: number): void {
  const g = ctx.createLinearGradient(0, -12, 0, 0);
  g.addColorStop(0, 'rgba(50,40,30,0)');
  g.addColorStop(1, 'rgba(50,40,30,.3)');
  ctx.fillStyle = g;
  ctx.fillRect(0, -12, w, 12);
  for (let x = 20; x < w - 10; x += 40) slit(ctx, x, -14, 12);
  nicheFrieze(ctx, w, -h, PLASTER, light);
}

/** Age 2 (Középkor): Backstein curtain on a fieldstone plinth, blind-niche frieze, coped merlons; square brick piers under slate needle spires. */
const BACKSTEIN_CURTAIN: WallAgeStyle = {
  readback: true,
  postHalf: 0.3,
  postTop: 142,
  shadow: (p, arm) => armShadow(p, arm, 0.22 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    prism(p, arm.a, arm.b, 0.225 * g, 0, 12, { color: FIELDSTONE, detail: 'fieldstone', batter: 0.04 });
    prism(p, arm.a, arm.b, 0.18 * g, 12, 56, { color: BRICK, detail: 'brick', top: WALK, face: (w, h, l) => curtainFace(p.ctx, w, h, l) });
    for (const c of stations(arm, 0.2, 0.04)) {
      const [m0, m1] = along(arm, c, 0.055);
      prism(p, m0, m1, 0.18 * g, 56, 67, { color: BRICK, detail: 'brick', top: COPING });
    }
  },
  post: (p) => {
    padShadow(p, 0.36);
    p.box(0.15, 0.15, 0.85, 0.85, 0, 12, { color: FIELDSTONE, detail: 'fieldstone' }, WALK);
    p.box(0.2, 0.2, 0.8, 0.8, 12, 90, { color: BRICK, detail: 'brick' }, WALK);
    const face = (light: number) => (w: number, h: number) => {
      const ctx = p.ctx;
      for (const dx of [-9, 3]) blindNiche(ctx, w / 2 + dx, -16, 6, 38, PLASTER, light);
      slit(ctx, w / 2, -62, 10);
      // White frieze band under the eaves.
      ctx.fillStyle = css(shade(PLASTER, light * 0.92));
      ctx.fillRect(0, -h + 4, w, 5);
      ctx.fillStyle = 'rgba(40,24,18,.4)';
      for (let x = 2; x < w - 2; x += 5) ctx.fillRect(x, -h + 9, 2.5, 2);
    };
    p.leftFace(0.2, 0.8, 0.8, 12, face(1), 78);
    p.rightFace(0.2, 0.8, 0.8, 12, face(R), 78);
    needleSpire(p, 0.5, 0.5, 0.3, 90, 52, SLATE, 'slate');
  },
};

/** Age 3 (Felvilágosodás): the star-fort trace in red Main sandstone, cream dressings, guérites under tall red-tiled needles. */
const SANDSTONE_FORT: WallAgeStyle = starFortWall({
  scarp: 0xa65b49,
  scarpDetail: 'stone',
  dressing: 0xdccfb0,
  coping: 0x7d5246,
  glacis: 0x587a34,
  glacisTop: 0x6b8f3f,
  sentryRoof: B.roof,
  sentryCap: 'needle',
});

/** The German wall styles by registry id (config/civs.ts wallStyle). */
export const GERMAN_WALL_STYLES: Readonly<Record<Extract<WallStyleId, 'limes_palisade' | 'backstein_curtain' | 'sandstone_fort'>, WallAgeStyle>> = {
  limes_palisade: LIMES_PALISADE,
  backstein_curtain: BACKSTEIN_CURTAIN,
  sandstone_fort: SANDSTONE_FORT,
};
