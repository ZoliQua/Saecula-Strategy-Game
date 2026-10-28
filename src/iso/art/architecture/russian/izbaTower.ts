import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import type { IsoPainter } from '../../isoPainter';
import { shade } from '../../palette';
import { onionDome } from '../kits/onionDome';
import { tentRoof } from '../kits/tentRoof';
import { post } from '../parts';
import type { ArchStyle } from '../style';
import { archer } from '../towerParts';
import type { BuildingArt } from '../types';
import { finialPole, footing, logBlock, logTown, oblam, type Block } from './izbaParts';

/*
 * Russian watchtower: a log shaft under an overhanging fighting gallery
 * (oblam); the archer stands on its open platform under a roof carried
 * on corner posts — a steep plank hip in age 1, a tall green tent with a
 * small onion in age 2 (on a white-stone foot).
 */

const SHAFT: Block = [0.2, 0.2, 0.8, 0.8];

function breastwork(p: IsoPainter, s: ArchStyle, g: Block, z: number, side: 'back' | 'front'): void {
  const [u0, v0, u1, v1] = g;
  const wall = { color: s.palette.timber, detail: 'planks' as const };
  if (side === 'back') {
    p.box(u0, v0, u1, v0 + 0.05, z, z + 12, wall, s.palette.timber);
    p.box(u0, v0, u0 + 0.05, v1, z, z + 12, wall, s.palette.timber);
  } else {
    p.box(u0, v1 - 0.05, u1, v1, z, z + 12, wall, s.palette.timber);
    p.box(u1 - 0.05, v0, u1, v1, z, z + 12, wall, s.palette.timber);
  }
}

function paintTower(p: IsoPainter, s: ArchStyle, team: number, age: 1 | 2): void {
  const k = logTown(s);
  const c = s.palette;
  const z = TOWER_PLATFORM_Z[age];
  p.footShadow();
  const stone = k.masonry === 'whiteStone' ? 56 : 0;
  if (stone) footing(p, s, SHAFT, stone, (w) => p.door(w / 2 - 6, 12, 24, c.doors.main));
  else p.box(0.16, 0.16, 0.84, 0.84, 0, 6, { color: c.stone, detail: 'fieldstone' }, c.stone);
  logBlock(p, s, SHAFT, stone || 6, z - 18, (w, h) => {
    if (!stone) p.door(w / 2 - 6, 12, 22, c.doors.main);
    p.ctx.fillStyle = '#18120d';
    p.ctx.fillRect(w / 2 - 1.5, -h + 18, 3, 12);
  }, (w, h) => {
    p.ctx.fillStyle = '#18120d';
    p.ctx.fillRect(w / 2 - 1.5, -h + 18, 3, 12);
  }, 0.06);
  const g = oblam(p, s, SHAFT, z - 18, 18, 0.08);
  p.ground(g[0], g[1], g[2], g[3], shade(c.timber, 1.1), z);
  const roofZ = z + 34;
  const corners: Array<readonly [number, number]> = [[g[0] + 0.03, g[1] + 0.03], [g[2] - 0.03, g[1] + 0.03], [g[0] + 0.03, g[3] - 0.03]];
  breastwork(p, s, g, z, 'back');
  for (const [u, v] of corners) post(p, u, v, z, roofZ, 2.4, c.timber);
  archer(p, 0.58, 0.42, z, team, 'kettle');
  breastwork(p, s, g, z, 'front');
  post(p, g[2] - 0.03, g[3] - 0.03, z, roofZ, 2.4, c.timber);
  let top: number;
  if (k.tents) {
    top = tentRoof(p, 0.5, 0.5, 0.4, roofZ, 78, c.roofAlt, { material: 'tile', eave: 0.06, ribs: shade(c.roofAlt, 1.35), lights: true });
    if (k.onions) top = onionDome(p, 0.5, 0.5, 0.075, top - 6, { color: c.metal, drum: { h: 8, color: c.ashlar } });
  } else {
    const prev = p.material;
    p.material = 'shingle';
    p.hipRoof(g[0], g[1], g[2], g[3], roofZ, 50, c.roof, 0.06);
    p.material = prev;
    finialPole(p, 0.5, 0.5, roofZ + 50);
    top = roofZ + 60;
  }
  p.flag(g[0] + 0.05, g[1] + 0.05, roofZ - 4, 30, team);
  p.addVolumePoint(0.5, 0.5, top);
}

/** The Russian watchtower of ages 1-2. */
export function izbaTower(s: ArchStyle): BuildingArt {
  const age = logTown(s).tents ? 2 : 1;
  return { size: 1, maxHeight: age === 2 ? 300 : 230, paint: (p, team) => paintTower(p, s, team, age) };
}
