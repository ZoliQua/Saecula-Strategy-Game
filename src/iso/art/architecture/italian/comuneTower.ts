import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { swallowtailCrown } from '../kits/swallowtail';
import { archer } from '../towerParts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { banner, block, brickWall, machicolation, putlogs, type Block } from './italianParts';
import { merlons, pointedOpening } from './comuneParts';

/*
 * Italian age-2 tower: a slender communal brick tower. A stone foot, a
 * narrow shaft pierced by putlog holes and a few pointed slits, a band
 * of stone corbels carrying a wider fighting platform, and its forked
 * swallowtail merlons — a flat, forked top, no spire or cap.
 */

const SHAFT: Block = [0.24, 0.24, 0.76, 0.76];

function paintTorre(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const z = TOWER_PLATFORM_Z[2];
  const ctx = p.ctx;
  p.footShadow();
  block(p, [0.16, 0.16, 0.84, 0.84], 0, 20, { color: c.stone, detail: 'stone' }, (w) => p.door(w / 2 - 6, 12, 17, shade(team, 0.8)), undefined, c.stone);
  const face = (light: number, front: boolean) => (w: number, h: number) => {
    putlogs(ctx, w, h, light);
    pointedOpening(ctx, w / 2 - 3, 6, 13, c.ashlar, light);
    ctx.fillStyle = css(shade(c.ashlar, light));
    ctx.fillRect(w / 2 - 5, -h + 24, 10, 16);
    p.window(w / 2 - 3, -h + 26, 6, 12, true);
    if (front) banner(ctx, w * 0.12, -h + 22, 6, 18, team, light);
  };
  block(p, SHAFT, 20, z, brickWall(s), face(1, true), face(R, false));
  const slab = machicolation(p, SHAFT, z, 14, 0.12, c.ashlar);
  const m = { ...merlons(s, 1.15), color: c.brick };
  swallowtailCrown(p, ...slab, z, 'back', m);
  archer(p, 0.5, 0.56, z, team, 'kettle');
  swallowtailCrown(p, ...slab, z, 'front', m);
  p.flag(slab[0] + 0.08, slab[1] + 0.08, z + 4, 30, team);
}

/** The Italian age-2 tower: a slender brick tower with a corbelled, swallowtail-crowned top. */
export function torreComunale(s: ArchStyle): BuildingArt {
  return { size: 1, maxHeight: 200, paint: (p, team) => paintTorre(p, s, team) };
}
