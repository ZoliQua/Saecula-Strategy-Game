import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import type { WallStyle } from '../../isoPainter';
import { shade } from '../../palette';
import { R } from '../facade';
import { styleFraming } from '../kits/halfTimber';
import { post } from '../parts';
import type { ArchStyle } from '../style';
import { archer, brazier } from '../towerParts';
import type { BuildingArt } from '../types';

/*
 * German age-1 tower: a Limes watchtower as reconstructed on the
 * Upper Germanic frontier — a square sandstone ground storey, a
 * whitewashed timber-framed upper storey, a plank gallery round the
 * fighting platform (archer and fire basket at TOWER_PLATFORM_Z) and a
 * steep shingle pyramid on corner posts with the team flag.
 */

/** The German age-1 tower (overrides the Roman family's). */
export function limesTower(s: ArchStyle): BuildingArt {
  const c = s.palette;
  return {
    size: 1,
    maxHeight: 250 + s.headroom,
    paint: (p, team) => {
      const z = TOWER_PLATFORM_Z[1];
      const stone: WallStyle = { color: c.ashlar, detail: 'stone' };
      const planks: WallStyle = { color: c.board, detail: 'planks' };
      p.footShadow();
      p.box(0.12, 0.12, 0.88, 0.88, 0, 8, { color: shade(c.ashlar, 0.85), detail: 'stone' }, c.ashlar);
      p.box(0.17, 0.17, 0.83, 0.83, 8, 62, stone);
      p.leftFace(0.17, 0.83, 0.83, 8, (w) => p.door(w / 2 - 6, 12, 22, c.doors.main), 54);
      p.rightFace(0.17, 0.83, 0.83, 8, (w) => {
        p.ctx.fillStyle = '#1a110c';
        p.ctx.fillRect(w / 2 - 1.3, -40, 2.6, 12);
      }, 54);
      p.box(0.17, 0.17, 0.83, 0.83, 62, z - 6, { color: c.plaster, detail: 'plaster' });
      const upper = (light: number) => (w: number, h: number) => {
        styleFraming(p.ctx, s, w, h, 'square', light);
        p.window(w / 2 - 4, -h + 12, 8, 11);
      };
      p.leftFace(0.17, 0.83, 0.83, 62, upper(1), z - 68);
      p.rightFace(0.17, 0.83, 0.83, 62, upper(R), z - 68);
      // Gallery: plank floor jutting on joists, breastwork, the lookout between.
      p.box(0.06, 0.06, 0.94, 0.94, z - 6, z, planks, c.board);
      const breast = (side: 'back' | 'front') => {
        const t = 0.05;
        const boxes = side === 'back' ? [[0.06, 0.06, 0.94, 0.06 + t], [0.06, 0.06, 0.06 + t, 0.94]] : [[0.06, 0.94 - t, 0.94, 0.94], [0.94 - t, 0.06, 0.94, 0.94]];
        for (const [a, b, e, f] of boxes) p.box(a!, b!, e!, f!, z, z + 12, planks, c.board);
      };
      breast('back');
      brazier(p, 0.26, 0.76, z, 1.25, 1.35);
      archer(p, 0.68, 0.36, z, team, 'galea');
      breast('front');
      const cap = z + 32;
      for (const [u, v] of [[0.09, 0.09], [0.91, 0.09], [0.09, 0.91], [0.91, 0.91]] as const) post(p, u, v, z + 12, cap, 2.4, c.timber);
      p.material = 'shingle';
      const rise = 44 * s.roof.pitch;
      p.hipRoof(0.02, 0.02, 0.98, 0.98, cap, rise, c.roof, 0.06);
      p.flag(0.5, 0.5, cap + rise - 2, 22, team);
    },
  };
}
