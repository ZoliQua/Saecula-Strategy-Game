import { TOWER_PLATFORM_Z } from '../../../../../config/visual';
import type { WallStyle } from '../../../isoPainter';
import { css, shade } from '../../../palette';
import { R } from '../../facade';
import { hasNeedleSpires, needleSpire, spireRoom } from '../../kits/needleSpire';
import type { ArchStyle } from '../../style';
import { lookout, parapet } from '../../towerParts';
import type { BuildingArt } from '../../types';
import { hangingBanner } from '../familyParts';

/** Grey Kentish ragstone of the Norman tower (and the English Norman walls) unless a style sets towerStone. */
export const NORMAN_RAGSTONE = 0x9a9c99;
const RAGSTONE = NORMAN_RAGSTONE;

/*
 * Tudor-family tower: a square Norman tower with clasping buttresses, a
 * corbel table, square merlons and a stair turret (needle-spired under
 * the needleSpires kit). The platform stays at TOWER_PLATFORM_Z.
 */

/** Age 2: square Norman tower — battered plinth, clasping buttresses, corbel table, square merlons, stair turret. */
export function normanTower(s: ArchStyle): BuildingArt {
  const c = s.palette;
  return {
    size: 1,
    maxHeight: 220 + spireRoom(s, 40),
    paint: (p, team) => {
      const z = TOWER_PLATFORM_Z[2];
      const stone = c.towerStone ?? RAGSTONE;
      const wall: WallStyle = { color: stone, detail: 'stone' };
      const ctx = p.ctx;
      p.footShadow();
      p.box(0.07, 0.07, 0.93, 0.93, 0, 16, { color: shade(c.stone, 0.9), detail: 'fieldstone' }, c.stone);
      p.box(0.13, 0.13, 0.87, 0.87, 16, z, wall);
      const face = (light: number, front: boolean) => (w: number, h: number) => {
        for (const x of [0, w - 7]) {
          ctx.fillStyle = css(shade(stone, light * 1.12));
          ctx.fillRect(x, -h, 7, h);
          ctx.fillStyle = css(shade(stone, light * 0.7));
          ctx.fillRect(x + (x === 0 ? 6 : 0), -h, 1.2, h);
        }
        for (const y of [h * 0.38, h * 0.74]) {
          ctx.fillStyle = css(shade(stone, light * 1.15));
          ctx.fillRect(0, -y - 2.6, w, 2.2);
        }
        // Corbel table under the parapet.
        ctx.fillStyle = css(shade(stone, light * 0.82));
        ctx.fillRect(0, -h, w, 3);
        for (let x = 4; x < w - 3; x += 6) ctx.fillRect(x, -h + 3, 3, 3.5);
        ctx.fillStyle = '#17120e';
        ctx.fillRect(w / 2 - 1.3, -h * 0.3, 2.6, 13);
        ctx.fillRect(w / 2 - 3.5, -h * 0.3 + 5, 7, 1.5);
        // Paired belfry lights with a colonnette.
        p.window(w / 2 - 7, -h * 0.68, 5.5, 14, true);
        p.window(w / 2 + 1.5, -h * 0.68, 5.5, 14, true);
        ctx.fillStyle = css(shade(stone, light * 1.1));
        ctx.fillRect(w / 2 - 0.9, -h * 0.68 + 2, 1.8, 13);
        if (front) {
          ctx.fillStyle = css(shade(stone, light * 1.15));
          ctx.beginPath();
          ctx.arc(w / 2, -18, 8.5, Math.PI, 0);
          ctx.lineTo(w / 2 + 8.5, 0);
          ctx.lineTo(w / 2 - 8.5, 0);
          ctx.fill();
          p.door(w / 2 - 6, 12, 22, c.doors.main);
        } else hangingBanner(ctx, w / 2 - 6, -h * 0.5, 12, 26, team, light, s.charge);
      };
      p.leftFace(0.13, 0.87, 0.87, 16, face(1, true), z - 16);
      p.rightFace(0.13, 0.87, 0.87, 16, face(R, false), z - 16);
      p.ground(0.13, 0.13, 0.87, 0.87, shade(c.roofAlt, 0.9), z);
      // Stair turret at the back corner rising above the wall-walk.
      const t = 0.26;
      p.box(0.1, 0.1, 0.1 + t, 0.1 + t, z, z + 26, wall, shade(stone, 1.08));
      const needle = hasNeedleSpires(s);
      if (needle) needleSpire(p, 0.1 + t / 2, 0.1 + t / 2, t / 2 + 0.02, z + 26, 46, c.metal, 'slate', 4);
      else {
        for (const [a, b] of [[0.1, 0.1], [0.1 + t - 0.075, 0.1], [0.1, 0.1 + t - 0.075], [0.1 + t - 0.075, 0.1 + t - 0.075]] as const) {
          p.box(a, b, a + 0.075, b + 0.075, z + 26, z + 33, wall, shade(stone, 1.08));
        }
      }
      parapet(p, 0.1, 0.1, 0.9, 0.9, z, wall, 'back', 3);
      lookout(p, 0.1, 0.9, z, team, 'kettle');
      parapet(p, 0.1, 0.1, 0.9, 0.9, z, wall, 'front', 3);
      if (needle) p.flag(0.86, 0.86, z + 6, 24, team, true);
      else p.flag(0.23, 0.23, z + 33, 24, team, true);
    },
  };
}
