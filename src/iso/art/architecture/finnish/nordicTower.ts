import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import type { IsoPainter } from '../../isoPainter';
import { shade } from '../../palette';
import { post } from '../parts';
import type { ArchStyle } from '../style';
import { archer } from '../towerParts';
import type { BuildingArt } from '../types';
import { belfry } from './nordicBelfry';
import { boulders, mainRoof, nDoor, nordic, wallBlock, type Block } from './nordicParts';

/*
 * Finnish watchtower. Age 1: a log shaft on a granite cairn under an
 * overhanging log gallery; the archer stands on its open platform under
 * a turf roof on corner posts. Ages 2-3: the bell tower (kellotapuli)
 * with the archer in its open belfry — under a shingled pyramid, or a
 * bell roof and lantern.
 */

const SHAFT: Block = [0.24, 0.24, 0.76, 0.76];

function loop(p: IsoPainter): (w: number, h: number) => void {
  return (w, h) => {
    p.ctx.fillStyle = '#18120d';
    p.ctx.fillRect(w / 2 - 1.5, -h + 16, 3, 11);
  };
}

function paintTower(p: IsoPainter, s: ArchStyle, team: number, age: 1 | 2 | 3): void {
  const c = s.palette;
  const z = TOWER_PLATFORM_Z[age];
  p.footShadow();
  const hat = age === 3 ? 'tricorn' : 'kettle';
  if (nordic(s).belfry !== 'lookout') {
    const top = belfry(p, s, [0.18, 0.18, 0.82, 0.82], 0, {
      lower: z - 10,
      upper: 36,
      face: (w) => nDoor(p, s, w / 2 - 6, 12, 22, c.doors.main, 1),
      inside: (zb) => archer(p, 0.58, 0.44, zb, team, hat),
    });
    p.flag(0.22, 0.22, top - 40, 26, team);
    return;
  }
  // Granite cairn foot.
  p.box(0.16, 0.16, 0.84, 0.84, 0, 12, { color: c.stone, detail: 'fieldstone' }, c.stone);
  boulders(p, s, 0.1, 0.78, 0.9, 0.92, 5, 4);
  wallBlock(p, s, SHAFT, 12, z - 18, (w, h) => {
    nDoor(p, s, w / 2 - 6, 12, 22, c.doors.main, 1);
    loop(p)(w, h);
  }, loop(p), 0.05);
  const g: Block = [0.15, 0.15, 0.85, 0.85];
  wallBlock(p, s, g, z - 18, z, loop(p), loop(p), 0.05);
  p.ground(g[0], g[1], g[2], g[3], shade(c.timber, 1.1), z);
  const roofZ = z + 32;
  for (const [u, v] of [[g[0] + 0.03, g[1] + 0.03], [g[2] - 0.03, g[1] + 0.03], [g[0] + 0.03, g[3] - 0.03]] as const) post(p, u, v, z, roofZ, 2.4, c.timber);
  archer(p, 0.58, 0.42, z, team, hat);
  p.box(g[0], g[3] - 0.04, g[2], g[3], z, z + 11, { color: c.timber, detail: 'planks' }, c.timber);
  p.box(g[2] - 0.04, g[1], g[2], g[3], z, z + 11, { color: c.timber, detail: 'planks' }, c.timber);
  post(p, g[2] - 0.03, g[3] - 0.03, z, roofZ, 2.4, c.timber);
  const top = mainRoof(p, s, [0.12, 0.12, 0.88, 0.88], roofZ, 'u', { scale: 1.2, overhang: 0.06 });
  p.flag(0.2, 0.2, roofZ - 4, 30, team);
  p.addVolumePoint(0.5, 0.5, top);
}

/** The Finnish watchtower of the style's age. */
export function nordicTower(s: ArchStyle, age: 1 | 2 | 3): BuildingArt {
  return { size: 1, maxHeight: age === 1 ? 210 : 290, paint: (p, team) => paintTower(p, s, team, age) };
}
