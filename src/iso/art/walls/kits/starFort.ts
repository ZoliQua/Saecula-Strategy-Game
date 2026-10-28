import type { Ctx } from '../../canvas';
import type { IsoPainter, WallStyle } from '../../isoPainter';
import { needleSpire } from '../../architecture/kits/needleSpire';
import { css, shade } from '../../palette';
import { WALL_E, WALL_N, WALL_NE, WALL_NW, WALL_S, WALL_SE, WALL_SW, WALL_W } from '../../../../game/wallNeighbours';
import { prism } from '../prism';
import type { WallAgeStyle } from '../wallKit';
import { reachBody } from './bankPalisade';
import { armShadow, frustum, line, padShadow } from './wallParts';

/*
 * Star-fort kit (English Georgian, German red sandstone): a low trace —
 * a sloped turf glacis in front, a battered scarp, a stone cordon and a
 * parapet with gun embrasures under the coping; quoined bastions with a
 * stone guérite and a gun on corner and end bastions. Each civ gives
 * the materials. The French Vauban trace (walls/french/vauban.ts) reuses
 * the glacis, quoins, cordon and gun with its own outline.
 */

export interface StarFortMaterials {
  /** Scarp and parapet masonry, and how its face is coursed. */
  readonly scarp: number;
  readonly scarpDetail: NonNullable<WallStyle['detail']>;
  /** Cordon, quoins and guérite dressings. */
  readonly dressing: number;
  /** Wall-walk and parapet coping. */
  readonly coping: number;
  readonly glacis: number;
  readonly glacisTop: number;
  /** The guérite's cap colour. */
  readonly sentryRoof: number;
  /** The guérite's cap: a low lead hip (default) or a tall tiled needle. */
  readonly sentryCap?: 'hip' | 'needle';
}

const STRAIGHT = [WALL_E | WALL_W, WALL_N | WALL_S, WALL_NE | WALL_SW, WALL_NW | WALL_SE];

/** Long-and-short stone quoins at both ends of a face (the bastion's angles). */
export function quoins(ctx: Ctx, w: number, h: number, light: number, dressing: number): void {
  for (let y = 0, i = 0; y < h - 2; y += 6, i++) {
    const qw = i % 2 ? 5 : 9;
    ctx.fillStyle = css(shade(dressing, light * 0.98));
    ctx.fillRect(0, -y - 5.5, qw, 5);
    ctx.fillRect(w - qw, -y - 5.5, qw, 5);
  }
}

/** Rounded stone cordon: a lit band over a shadowed underside. */
export function cordonFace(ctx: Ctx, w: number, h: number): void {
  ctx.fillStyle = 'rgba(240,244,248,.35)';
  ctx.fillRect(0, -h, w, 1.2);
  ctx.fillStyle = 'rgba(30,26,24,.4)';
  ctx.fillRect(0, -1.2, w, 1.2);
}

/** Splayed gun embrasures cut down into the parapet at intervals, over its coping line. */
export function embrasures(ctx: Ctx, w: number, h: number, light: number, coping: number): void {
  ctx.fillStyle = css(shade(coping, light), 0.9);
  ctx.fillRect(0, -h, w, 1.6);
  for (let x = 14; x < w - 8; x += 28) {
    ctx.fillStyle = css(shade(0x1c1512, light));
    ctx.beginPath();
    ctx.moveTo(x - 4.5, -h);
    ctx.lineTo(x + 4.5, -h);
    ctx.lineTo(x + 2, -h + 4.5);
    ctx.lineTo(x - 2, -h + 4.5);
    ctx.closePath();
    ctx.fill();
  }
}

/** Grass blades along the foot of the glacis, darker turf at the top break of slope. */
export function glacisFace(ctx: Ctx, w: number, h: number, light: number, glacisTop: number): void {
  ctx.fillStyle = css(shade(glacisTop, light * 1.08), 0.55);
  for (let x = 2; x < w; x += 5) ctx.fillRect(x, -2 - ((x * 7) % 3), 1, 2 + ((x * 3) % 3));
  ctx.fillStyle = 'rgba(20,30,10,.25)';
  ctx.fillRect(0, -h, w, 1.4);
}

/** A stone guérite (sentry box) on the bastion's right-hand salient: a small turret with a cap. */
function guerite(p: IsoPainter, z: number, m: StarFortMaterials): void {
  const [u0, v0, u1, v1] = [0.6, 0.2, 0.78, 0.38];
  p.box(u0, v0, u1, v1, z, z + 11, { color: m.dressing, detail: 'stone' }, m.coping);
  const slit = (w: number) => {
    p.ctx.fillStyle = '#16120f';
    p.ctx.fillRect(w / 2 - 0.9, -8.5, 1.8, 5.5);
  };
  p.leftFace(u0, u1, v1, z, slit, 11);
  p.rightFace(v0, v1, u1, z, slit, 11);
  if (m.sentryCap === 'needle') needleSpire(p, (u0 + u1) / 2, (v0 + v1) / 2, 0.1, z + 11, 26, m.sentryRoof, 'tile');
  else p.hipRoof(u0, v0, u1, v1, z + 11, 9, m.sentryRoof, 0.03);
}

/** A field gun on the bastion's terreplein, its muzzle over the salient. */
export function gun(p: IsoPainter, z: number): void {
  p.box(0.5, 0.5, 0.68, 0.68, z, z + 4.5, { color: 0x4a3524 }, 0x5a4230);
  for (const [u, v] of [[0.52, 0.68], [0.68, 0.52]] as const) {
    const [x, y] = p.p(u, v, z + 2.5);
    p.ctx.fillStyle = '#2b2018';
    p.ctx.beginPath();
    p.ctx.ellipse(x, y, 3.2, 3.6, 0, 0, Math.PI * 2);
    p.ctx.fill();
  }
  const a = p.p(0.54, 0.54, z + 7);
  const b = p.p(0.84, 0.84, z + 7.5);
  line(p, a, b, '#202226', 7.5);
  line(p, [a[0], a[1] - 2], [b[0], b[1] - 2], '#757a80', 1.8);
  p.ctx.fillStyle = '#0d0e10';
  p.ctx.beginPath();
  p.ctx.arc(b[0], b[1], 2.4, 0, Math.PI * 2);
  p.ctx.fill();
  p.normalCylinder(Math.min(a[0], b[0]) - 3, Math.min(a[1], b[1]) - 3, Math.abs(b[0] - a[0]) + 6, Math.abs(b[1] - a[1]) + 6);
}

/** The star-fort wall style in a civ's materials. */
export function starFortWall(m: StarFortMaterials): WallAgeStyle {
  const scarp = { color: m.scarp, detail: m.scarpDetail } as const;
  return {
    readback: true,
    postBody: 0.22,
    armStart: reachBody(0.22),
    postHalf: 0.37,
    postTop: 46,
    shadow: (p, arm) => armShadow(p, arm, 0.36 * arm.girth),
    arm: (p, arm) => {
      const g = arm.girth;
      prism(p, arm.a, arm.b, 0.44 * g, 0, 7, { color: m.glacis, top: m.glacisTop, batter: 0.15, face: (w, h, l) => glacisFace(p.ctx, w, h, l, m.glacisTop) });
      prism(p, arm.a, arm.b, 0.29 * g, 7, 27, { ...scarp, batter: 0.07 });
      prism(p, arm.a, arm.b, 0.235 * g, 27, 30, { color: m.dressing, top: m.coping, face: (w, h) => cordonFace(p.ctx, w, h) });
      prism(p, arm.a, arm.b, 0.22 * g, 30, 37.5, { ...scarp, top: m.coping, batter: 0.03, face: (w, h, l) => embrasures(p.ctx, w, h, l, m.coping) });
    },
    post: (p, arms) => {
      padShadow(p, 0.44);
      frustum(p, 0.02, 0.02, 0.98, 0.98, 0, 7, 0.14, { color: m.glacis, top: m.glacisTop, face: (w, h, l) => glacisFace(p.ctx, w, h, l, m.glacisTop) });
      frustum(p, 0.15, 0.15, 0.85, 0.85, 7, 30, 0.075, { ...scarp, face: (w, h, l) => quoins(p.ctx, w, h, l, m.dressing) });
      frustum(p, 0.21, 0.21, 0.79, 0.79, 30, 33, 0, { color: m.dressing, top: m.coping, face: (w, h) => cordonFace(p.ctx, w, h) });
      frustum(p, 0.22, 0.22, 0.78, 0.78, 33, 41, 0.02, { ...scarp, top: m.coping, face: (w, h, l) => embrasures(p.ctx, w, h, l, m.coping) });
      // Corner and end bastions mount a gun and a guérite on their salient; rhythm piers of a straight run carry only the flag.
      if (STRAIGHT.includes(arms)) return;
      gun(p, 41);
      guerite(p, 41, m);
    },
  };
}
