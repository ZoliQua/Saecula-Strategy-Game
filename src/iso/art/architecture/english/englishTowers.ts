import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import type { IsoPainter, WallStyle } from '../../isoPainter';
import { shade } from '../../palette';
import { R } from '../facade';
import { hangingBanner } from '../families/familyParts';
import { post } from '../parts';
import type { ArchStyle } from '../style';
import { lookout, towerLine as line } from '../towerParts';
import type { BuildingArt } from '../types';

type Pt = readonly [number, number];

/*
 * English age-1 tower: a timber watchtower with a thatched cap on an
 * earth mound (Romano-British). The Norman tower (families/tudor) and
 * the Martello tower (families/georgian) belong to the families other
 * civs ride. The fighting platform stays at TOWER_PLATFORM_Z, where the
 * arrows leave from.
 */

/** Turfed earth mound under a timber tower (a small motte). */
function mound(p: IsoPainter, h: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(0.5, 0.5, 0);
  const rx = 52;
  const g = ctx.createLinearGradient(x - rx, y - h, x + rx, y);
  g.addColorStop(0, '#7c9a4c');
  g.addColorStop(0.6, '#5a7636');
  g.addColorStop(1, '#3c5226');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - rx, y - 2);
  ctx.quadraticCurveTo(x - rx * 0.6, y - h - 12, x, y - h - 14);
  ctx.quadraticCurveTo(x + rx * 0.6, y - h - 12, x + rx, y - 2);
  ctx.quadraticCurveTo(x, y + 14, x - rx, y - 2);
  ctx.fill();
  p.normalCylinder(x - rx, y - h - 14, rx * 2, h + 26);
}

/** Age 1: braced timber watchtower on a mound, plank breastwork, thatched pyramid cap on corner posts. */
export function timberWatchtower(s: ArchStyle): BuildingArt {
  const c = s.palette;
  return {
    size: 1,
    maxHeight: 240,
    paint: (p, team) => {
      const z = TOWER_PLATFORM_Z[1];
      const base = 8;
      p.footShadow();
      mound(p, base);
      const corners = [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]] as const;
      const legs: Pt[][] = [];
      // Back three posts, the braces on the two visible sides, then the front post.
      for (const [u, v] of corners.slice(0, 3)) post(p, u, v, base, z, 3.4, c.timber);
      for (const [a0, b0, a1, b1] of [[0.2, 0.8, 0.8, 0.8], [0.8, 0.2, 0.8, 0.8]] as const) {
        for (const [zl, zh] of [[base + 6, 64], [64, z - 8]] as const) {
          const pa: Pt[] = [p.p(a0, b0, zl), p.p(a1, b1, zh)];
          const pb: Pt[] = [p.p(a1, b1, zl), p.p(a0, b0, zh)];
          line(p, pa[0]!, pa[1]!, shade(c.timber, 0.9), 2.2);
          line(p, pb[0]!, pb[1]!, shade(c.timber, 0.9), 2.2);
          legs.push(pa, pb);
        }
      }
      // Ladder up the lit side.
      for (const du of [0.42, 0.56]) legs.push([p.p(du, 0.86, base), p.p(du, 0.8, z - 6)]);
      for (const l of legs.slice(-2)) line(p, l[0]!, l[1]!, shade(c.timber, 1.1), 1.6);
      for (let k = base + 8; k < z - 8; k += 9) line(p, p.p(0.42, 0.85, k), p.p(0.56, 0.85, k), shade(c.timber, 1.1), 1.2);
      p.normals.cylinderStroke(legs, 2.4, p.p(0.2, 0.8, 0)[0], p.p(0.8, 0.2, 0)[0] - p.p(0.2, 0.8, 0)[0]);
      post(p, 0.8, 0.8, base, z, 3.4, c.timber);
      // Platform and plank breastwork.
      const planks: WallStyle = { color: c.board, detail: 'planks' };
      p.box(0.1, 0.1, 0.9, 0.9, z - 7, z, planks, c.board);
      const breast = (side: 'back' | 'front') => {
        const t = 0.05;
        const boxes = side === 'back' ? [[0.1, 0.1, 0.9, 0.1 + t], [0.1, 0.1, 0.1 + t, 0.9]] : [[0.1, 0.9 - t, 0.9, 0.9], [0.9 - t, 0.1, 0.9, 0.9]];
        for (const [a, b, e, f] of boxes) p.box(a!, b!, e!, f!, z, z + 13, planks, c.board);
      };
      breast('back');
      lookout(p, 0.1, 0.9, z, team, 'galea');
      breast('front');
      p.rightFace(0.1, 0.9, 0.9, z, (w) => hangingBanner(p.ctx, w / 2 - 6, -12, 12, 24, team, R, s.charge), 13);
      // Cap posts and the steep thatched pyramid.
      const cap = z + 30;
      for (const [u, v] of corners) post(p, u - (u < 0.5 ? 0.06 : -0.06), v - (v < 0.5 ? 0.06 : -0.06), z + 13, cap, 2.4, c.timber);
      p.material = 'thatch';
      const rise = 34 * s.roof.pitch;
      p.hipRoof(0.1, 0.1, 0.9, 0.9, cap, rise, c.thatch, 0.1);
      p.flag(0.5, 0.5, cap + rise - 2, 22, team);
    },
  };
}
