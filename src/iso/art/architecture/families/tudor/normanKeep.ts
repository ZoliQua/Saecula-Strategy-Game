import type { IsoPainter, WallStyle } from '../../../isoPainter';
import { css, shade } from '../../../palette';
import { R } from '../../facade';
import type { ArchStyle } from '../../style';
import { parapet } from '../../towerParts';
import { hasNeedleSpires, needleSpire } from '../../kits/needleSpire';
import { hangingBanner } from '../familyParts';

/*
 * Norman square keep (the English age-2 town centre): a grey ashlar
 * tower on a battered plinth, clasping pilaster buttresses, string
 * courses, arrow slits below and paired round-arched windows above,
 * square merlons and four corner turrets, team banners and flag.
 */

const TURRET = 0.24;
const TURRET_RISE = 20;
/** Rise of the keep's needle spire (styles with needle spires). */
export const KEEP_SPIRE = 92;

/** Corner turret rising above the parapet, with four small corner merlons or a needle spire (`spire` colour). */
function turret(p: IsoPainter, u: number, v: number, z: number, wall: WallStyle, cap: number, spire?: number): void {
  const t = TURRET;
  p.box(u, v, u + t, v + t, z, z + TURRET_RISE, wall, cap);
  if (spire !== undefined) {
    needleSpire(p, u + t / 2, v + t / 2, t / 2 + 0.015, z + TURRET_RISE, 34, spire, 'slate', 4);
    return;
  }
  const m = 0.075;
  const top = z + TURRET_RISE;
  for (const [a, b] of [[u, v], [u + t - m, v], [u, v + t - m], [u + t - m, v + t - m]] as const) {
    p.box(a, b, a + m, b + m, top, top + 7, wall, cap);
  }
}

/**
 * Keep of edge `d` tiles at (u0, v0), `h` art px to the wall-walk.
 * A style with needle spires caps the turrets and raises a tall
 * octagonal slate spire from the roof-walk (a Bergfried's helm).
 * Returns the height of the turret tops or the spire apex.
 */
export function normanKeep(p: IsoPainter, s: ArchStyle, u0: number, v0: number, d: number, h: number, team: number): number {
  const c = s.palette;
  const ctx = p.ctx;
  const u1 = u0 + d;
  const v1 = v0 + d;
  const wall: WallStyle = { color: c.ashlar, detail: 'stone' };
  const cap = shade(c.ashlar, 1.08);
  p.box(u0 - 0.05, v0 - 0.05, u1 + 0.05, v1 + 0.05, 0, 14, { color: shade(c.stone, 0.92), detail: 'fieldstone' }, c.stone);
  p.box(u0, v0, u1, v1, 14, h, wall);
  const face = (light: number, banner: boolean) => (w: number, fh: number) => {
    // Clasping buttresses: pale pilaster strips at the corners and the middle.
    for (const x of [0, w / 2 - 4, w - 8]) {
      ctx.fillStyle = css(shade(c.ashlar, light * 1.12));
      ctx.fillRect(x, -fh, 8, fh);
      ctx.fillStyle = css(shade(c.ashlar, light * 0.7));
      ctx.fillRect(x + 6.6, -fh, 1.4, fh);
    }
    // String courses.
    for (const y of [fh * 0.36, fh * 0.7]) {
      ctx.fillStyle = css(shade(c.ashlar, light * 1.15));
      ctx.fillRect(0, -y - 3, w, 2.2);
      ctx.fillStyle = 'rgba(25,20,15,.35)';
      ctx.fillRect(0, -y - 0.8, w, 1.2);
    }
    // Arrow slits in the lower stage.
    ctx.fillStyle = '#17120e';
    for (const x of [w * 0.25, w * 0.75]) {
      ctx.fillRect(x - 1.3, -fh * 0.3, 2.6, 14);
      ctx.fillRect(x - 3.5, -fh * 0.3 + 5, 7, 1.6);
    }
    // Middle stage: single round-arched windows; top stage: paired lights with a colonnette.
    for (const x of [w * 0.25, w * 0.75]) {
      p.window(x - 3, -fh * 0.62, 6, 12, true);
      p.window(x - 7, -fh * 0.93, 5.5, 14, true);
      p.window(x + 1.5, -fh * 0.93, 5.5, 14, true);
      ctx.fillStyle = css(shade(c.ashlar, light * 1.1));
      ctx.fillRect(x - 0.9, -fh * 0.93 + 2, 1.8, 13);
    }
    if (banner) hangingBanner(ctx, w / 2 - 7, -fh * 0.67, 14, 40, team, light, s.charge);
  };
  p.leftFace(u0, u1, v1, 14, face(1, true), h - 14);
  p.rightFace(v0, v1, u1, 14, face(R, true), h - 14);
  // Roof-walk, then turrets and merlons back → front.
  p.ground(u0, v0, u1, v1, shade(c.roofAlt, 0.9), h);
  const spire = hasNeedleSpires(s) ? c.metal : undefined;
  turret(p, u0 - 0.03, v0 - 0.03, h, wall, cap, spire);
  parapet(p, u0, v0, u1, v1, h, wall, 'back', 4);
  turret(p, u1 - TURRET + 0.03, v0 - 0.03, h, wall, cap, spire);
  turret(p, u0 - 0.03, v1 - TURRET + 0.03, h, wall, cap, spire);
  const apex = spire === undefined ? 0 : needleSpire(p, (u0 + u1) / 2, (v0 + v1) / 2, d * 0.3, h, KEEP_SPIRE, spire);
  parapet(p, u0, v0, u1, v1, h, wall, 'front', 4);
  turret(p, u1 - TURRET + 0.03, v1 - TURRET + 0.03, h, wall, cap, spire);
  if (spire !== undefined) return apex;
  const top = h + TURRET_RISE + 7;
  p.flag(u0 + TURRET / 2 - 0.03, v0 + TURRET / 2 - 0.03, top - 7, 26, team, true);
  return top;
}
